// Razorpay billing routes. Mounted before the global v1 auth guard so the
// gateway webhook stays public; every user-facing route authenticates below.

import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../middleware/auth.ts";
import {
  createBundleOrderSchema,
  createCreditOrderSchema,
  createPlanOrderSchema,
  verifyOrderSchema,
} from "../../middleware/billing.validate.ts";
import { validate } from "../../middleware/validate.ts";
import {
  createTrialRequestSchema,
} from "../../middleware/trialRequest.validate.ts";
import {
  createBundleOrderHandler,
  createCreditOrderHandler,
  createPlanOrderHandler,
  downloadInvoiceHandler,
  emailInvoiceHandler,
  getBillingConfigHandler,
  getCheckoutSuggestionHandler,
  getCreditBalanceHandler,
  getInvoiceHandler,
  getOrderHandler,
  listTransactionsHandler,
  razorpayWebhookHandler,
  recordCheckoutEventHandler,
  verifyBundleOrderHandler,
  verifyCreditOrderHandler,
  verifyPlanOrderHandler,
} from "../../controllers/billing.controller.ts";
import {
  createTrialRequestHandler,
  getTrialStatusHandler,
} from "../../controllers/trialRequest.controller.ts";

const router = Router();

// Public endpoints. The key id is intentionally public (it is the checkout
// key embedded in Razorpay's client script).
router.get("/config", getBillingConfigHandler);
router.post("/webhook", razorpayWebhookHandler);
router.get(
  "/suggestions",
  optionalAuthenticate,
  getCheckoutSuggestionHandler
);
router.post(
  "/events",
  optionalAuthenticate,
  recordCheckoutEventHandler
);

router.use(authenticate);

router.post(
  "/credits/orders",
  validate(createCreditOrderSchema),
  createCreditOrderHandler
);
router.post(
  "/credits/verify",
  validate(verifyOrderSchema),
  verifyCreditOrderHandler
);
router.get("/credits/balance", getCreditBalanceHandler);
router.get("/trial", getTrialStatusHandler);
router.post(
  "/trial/request",
  validate(createTrialRequestSchema),
  createTrialRequestHandler
);
router.post(
  "/plans/orders",
  validate(createPlanOrderSchema),
  createPlanOrderHandler
);
router.post(
  "/plans/verify",
  validate(verifyOrderSchema),
  verifyPlanOrderHandler
);
router.post(
  "/bundles/orders",
  validate(createBundleOrderSchema),
  createBundleOrderHandler
);
router.post(
  "/bundles/verify",
  validate(verifyOrderSchema),
  verifyBundleOrderHandler
);
router.get("/transactions", listTransactionsHandler);
router.get("/orders/:orderId/invoice", getInvoiceHandler);
router.get("/orders/:orderId/invoice/pdf", downloadInvoiceHandler);
router.post("/orders/:orderId/invoice/email", emailInvoiceHandler);
router.get("/orders/:orderId", getOrderHandler);

export default router;
