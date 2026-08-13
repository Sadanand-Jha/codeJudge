/**
 * Placeholder for AI-related database operations.
 *
 * Currently unused — AI interactions are stateless: the backend sends the
 * extracted text + options to the model, parses the returned questions, and
 * returns them to the client without persisting anything in this module.
 * Persistence of generated quizzes happens on the quiz side
 * (`src/services/database/quiz.service.ts`).
 *
 * If AI outputs ever need to be stored (e.g. usage/credit tracking, caching
 * generated questions, or logging prompts/responses), add those data-access
 * helpers here.
 */
export {};