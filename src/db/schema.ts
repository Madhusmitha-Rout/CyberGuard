import { pgTable, serial, text, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  learnerId: text("learner_id").notNull(),
  displayName: text("display_name").notNull().default("Learner"),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  percentage: real("percentage").notNull(),
  // e.g. { phishing: { correct: 2, total: 3 }, upi: {...} }
  categoryBreakdown: jsonb("category_breakdown").notNull(),
  // array of { questionId, chosen, correct, isCorrect, category }
  answers: jsonb("answers").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type NewQuizAttempt = typeof quizAttempts.$inferInsert;
