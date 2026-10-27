// Razorpay billing routes. Mounted before the global v1 auth guard so the
// gateway webhook stays public; every user-facing route authenticates below.

import { Router } from "express";
import { authenticate } from "../../middleware/auth.ts";
import {
  createCreditOrderSchema,
  createPlanOrderSchema,
  verifyOrderSchema,
} from "../../middleware/billing.validate.ts";
import { validate } from "../../middleware/validate.ts";
import {
  createCreditOrderHandler,
  createPlanOrderHandler,
  getBillingConfigHandler,
  getCreditBalanceHandler,
  getOrderHandler,
  listCreditTransactionsHandler,
  listTransactionsHandler,
  razorpayWebhookHandler,
  verifyCreditOrderHandler,
  verifyPlanOrderHandler,
} from "../../controllers/billing.controller.ts";

const router = Router();

// Public endpoints. The key id is intentionally public (it is the checkout
// key embedded in Razorpay's client script).
router.get("/config", getBillingConfigHandler);
router.post("/webhook", razorpayWebhookHandler);

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
router.get("/credits/transactions", listCreditTransactionsHandler);
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
router.get("/transactions", listTransactionsHandler);
router.get("/orders/:orderId", getOrderHandler);

export default router;
