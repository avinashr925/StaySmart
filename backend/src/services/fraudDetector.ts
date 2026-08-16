import User from "../models/user";
import Session from "../models/session";
import Payment from "../models/payment";
import { logger } from "../utils/logger";

export interface IFraudEvaluation {
  riskScore: number; // 0 to 100
  riskStatus: "Low" | "Medium" | "High";
  reasons: string[];
}

export const evaluateRiskScore = async (
  userId: string,
  ipAddress: string,
  checkoutAmount: number
): Promise<IFraudEvaluation> => {
  const reasons: string[] = [];
  let score = 10; // base score

  try {
    const user = await User.findById(userId);
    if (!user) {
      return { riskScore: 100, riskStatus: "High", reasons: ["User record not found in system"] };
    }

    // 1) Evaluate login suspension
    if (user.isSuspended) {
      score += 50;
      reasons.push("User account is currently flagged as suspended.");
    }

    // 2) IP Address velocity evaluation
    const activeSessions = await Session.find({ user: userId });
    const uniqueIps = new Set(activeSessions.map((s) => s.ipAddress));
    if (uniqueIps.size > 2) {
      score += 30;
      reasons.push(`Multiple concurrent IP addresses detected (${uniqueIps.size} active connections).`);
    }

    // 3) Transaction limits evaluation
    if (checkoutAmount > 100000) {
      score += 20;
      reasons.push("High-value checkout transaction exceeding ₹1,00,000 threshold.");
    }

    // 4) Check past transaction success histories
    const pastFailedPayments = await Payment.countDocuments({ user: userId, status: "Failed" });
    if (pastFailedPayments > 3) {
      score += 25;
      reasons.push(`Frequent transaction failures detected (${pastFailedPayments} past failures).`);
    }

  } catch (err) {
    logger.error("Fraud detector evaluation failure: " + (err instanceof Error ? err.message : String(err)));
  }

  // Cap score
  const finalScore = Math.min(score, 100);
  let riskStatus: "Low" | "Medium" | "High" = "Low";
  if (finalScore > 70) riskStatus = "High";
  else if (finalScore > 35) riskStatus = "Medium";

  return {
    riskScore: finalScore,
    riskStatus,
    reasons: reasons.length > 0 ? reasons : ["No anomalous activities detected on session audits."],
  };
};
