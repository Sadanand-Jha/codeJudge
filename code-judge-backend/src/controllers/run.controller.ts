// TypeScript then knows these are only types and removes them from the generated JavaScript.
import type { Request, Response } from "express";
import judge0 from "../services/judge0.service.js";

// "I'm importing these only for type checking. They are never needed when the program runs."

export const runCode = async (req: Request, res: Response) => {
    try {
        const { source_code, language_id, stdin } = req.body;
        const submission = await judge0.post(
            "/submissions?base64_encoded=false&wait=true",
            {
                source_code,
                language_id,
                stdin,
            }
        );

        return res.json(submission.data);
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: "Judge0 Error",
        });
    }
};