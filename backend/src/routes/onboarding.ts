import { Router } from 'express';
import crypto from 'crypto';
import { query, withTransaction } from '../db.js';
import { authenticateToken, requireAuth } from '../middleware/auth.js';
import { recordAuditEvent } from '../utils/audit.js';
import { BadRequestError, ConflictError } from '../utils/errors.js';

export const onboardingRouter = Router();

// Apply authentication middleware to all onboarding endpoints
onboardingRouter.use(authenticateToken);

// Helper to create a URL-friendly slug
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// GET /api/v1/onboarding/draft - Get Existing Onboarding Progress or Draft
onboardingRouter.get('/draft', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;

    // Check if user already owns an in-progress organisation
    const orgRes = await query(
      `SELECT o.*, om.role
       FROM organisations o
       JOIN organisation_members om ON om.organisation_id = o.id
       WHERE om.user_id = $1
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (orgRes.rows.length === 0) {
      return res.json({
        success: true,
        hasExistingWorkspace: false,
        onboardingStep: 1,
        draft: null,
      });
    }

    const org = orgRes.rows[0];
    res.json({
      success: true,
      hasExistingWorkspace: true,
      onboardingStatus: org.onboarding_status,
      onboardingStep: org.onboarding_step,
      organisation: org,
      draft: org.onboarding_data,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/onboarding/save-draft - Save Progressive Onboarding Progress
onboardingRouter.post('/save-draft', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const { step = 1, draftData = {}, organisationId } = req.body;

    if (organisationId) {
      await query(
        `UPDATE organisations 
         SET onboarding_step = $1, onboarding_data = $2, updated_at = NOW() 
         WHERE id = $3`,
        [step, JSON.stringify(draftData), organisationId]
      );
    }

    res.json({
      success: true,
      message: 'Onboarding draft saved. You may resume anytime.',
      step,
      draftData,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/onboarding/complete - Finalize Business Registration & Activate Workspace
onboardingRouter.post('/complete', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const {
      // Step 1: Personal info
      jobTitle,
      phoneNumber,
      userRole = 'owner', // 'owner', 'finance_manager', 'approver'

      // Step 2: Business details
      businessName,
      country = 'NGA',
      businessType = 'limited_company',
      baseCurrency = 'NGN',

      // Step 3: Contact & Address
      contactEmail,
      contactPhone,
      website,
      operatingAddress = {},

      // Step 4: Verification Information
      registrationNumber,
      taxId,
      kybDocuments = [],
    } = req.body;

    if (!businessName || !businessName.trim()) {
      throw new BadRequestError('Business legal name is required.');
    }

    if (!country || !baseCurrency) {
      throw new BadRequestError('Country of registration and base currency are required.');
    }

    const trimmedName = businessName.trim();
    let baseSlug = slugify(trimmedName) || 'business';
    let uniqueSlug = baseSlug;

    // Check slug uniqueness
    const existingSlug = await query(`SELECT id FROM organisations WHERE slug = $1`, [uniqueSlug]);
    if (existingSlug.rows.length > 0) {
      uniqueSlug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
    }

    // Default policy limits based on currency
    let maxSingleMinor = '2500000000'; // 25M NGN
    let maxDailyMinor = '10000000000'; // 100M NGN
    let dualThresholdMinor = '750000000'; // 7.5M NGN

    if (baseCurrency === 'USD') {
      maxSingleMinor = '5000000'; // $50,000
      maxDailyMinor = '25000000'; // $250,000
      dualThresholdMinor = '1000000'; // $10,000
    } else if (baseCurrency === 'KES') {
      maxSingleMinor = '500000000'; // 5M KES
      maxDailyMinor = '2000000000'; // 20M KES
      dualThresholdMinor = '100000000'; // 1M KES
    }

    // Transactionally create Organisation, Member, and Policy
    const createdOrg = await withTransaction(async (client) => {
      // 1. Insert Organisation with honest 'pending_verification' status
      const orgRes = await client.query(
        `INSERT INTO organisations (
           name, slug, business_type, country, base_currency, 
           tax_id, registration_number, contact_email, contact_phone, website, operating_address,
           onboarding_status, onboarding_step, onboarding_data,
           kyb_verification_status, kyb_documents, kyb_notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending_verification', 5, $12, 'pending_review', $13, $14)
         RETURNING *`,
        [
          trimmedName,
          uniqueSlug,
          businessType,
          country.toUpperCase(),
          baseCurrency.toUpperCase(),
          taxId?.trim() || null,
          registrationNumber?.trim() || null,
          contactEmail?.trim() || user.email,
          contactPhone?.trim() || phoneNumber?.trim() || user.phone_number || null,
          website?.trim() || null,
          JSON.stringify(operatingAddress),
          JSON.stringify(req.body),
          JSON.stringify(kybDocuments),
          'Submitted for compliance review. Operational sandbox access enabled.',
        ]
      );

      const org = orgRes.rows[0];

      // 2. Add User as Organisation Member with chosen role (default: owner)
      const validRole = ['owner', 'finance_manager', 'approver'].includes(userRole) ? userRole : 'owner';
      await client.query(
        `INSERT INTO organisation_members (organisation_id, user_id, role, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (organisation_id, user_id) 
         DO UPDATE SET role = EXCLUDED.role, is_active = TRUE`,
        [org.id, user.id, validRole]
      );

      // 3. Update User phone or details if provided
      if (phoneNumber && phoneNumber !== user.phone_number) {
        await client.query(`UPDATE users SET phone_number = $1 WHERE id = $2`, [phoneNumber.trim(), user.id]);
      }

      // 4. Create Organisation Policy
      await client.query(
        `INSERT INTO organisation_policies (
           organisation_id, max_single_payment_minor, max_daily_payment_minor, 
           dual_approval_threshold_minor, require_new_recipient_review, block_unverified_corridors
         ) VALUES ($1, $2, $3, $4, TRUE, TRUE)
         ON CONFLICT (organisation_id) DO NOTHING`,
        [org.id, maxSingleMinor, maxDailyMinor, dualThresholdMinor]
      );

      return org;
    });

    // Record immutable audit event
    await recordAuditEvent({
      organisationId: createdOrg.id,
      resourceType: 'policy',
      resourceId: createdOrg.id,
      action: 'business_workspace_created',
      actorId: user.id,
      actorName: user.full_name,
      actorRole: userRole,
      metadata: {
        businessName: trimmedName,
        country,
        baseCurrency,
        businessType,
        kybStatus: 'pending_review',
        registrationNumber,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Business workspace successfully created. Verification documents submitted for review.',
      organisation: createdOrg,
      role: userRole,
    });
  } catch (err) {
    next(err);
  }
});

