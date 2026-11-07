import type { Request, Response } from "express";
import { ZodError } from "zod";
import { EntitlementError } from "../services/entitlements/errors.ts";
import {
  createTeacherSyllabus,
  deleteTeacherSyllabus,
  getSyllabusTree,
  getTeacherSyllabi,
  renameTeacherSyllabus,
  searchSyllabusCatalog,
  updateTeacherSyllabus,
  type SyllabusSearchType,
} from "../services/customSyllabus.service.ts";
import {
  getSyllabusImportCostInfo,
  getSyllabusImportJob,
  startSyllabusImport,
} from "../services/syllabusBreakdown.service.ts";
import { SyllabusServiceError } from "../services/syllabusSchema.ts";
import { subscribeSyllabusImportStream } from "../services/syllabusImportStream.ts";

const userId = (req: Request): number => {
  const id = Number(req.user?.userId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new SyllabusServiceError(401, "Authentication required.", "UNAUTHENTICATED");
  }
  return id;
};

const syllabusId = (req: Request): number => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new SyllabusServiceError(400, "Select a valid syllabus.", "INVALID_SYLLABUS");
  }
  return id;
};

const optionalPositiveInt = (value: unknown, label: string): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new SyllabusServiceError(400, `Select a valid ${label}.`, "INVALID_FILTER");
  }
  return parsed;
};

const sendError = (res: Response, error: unknown): Response => {
  if (error instanceof SyllabusServiceError) {
    return res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  }
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return res.status(400).json({
      success: false,
      code: "INVALID_SYLLABUS",
      message: issue?.message || "Check the syllabus fields and try again.",
      issues: error.issues.map((item) => ({
        path: item.path.join("."),
        message: item.message,
      })),
    });
  }
  if (error instanceof EntitlementError) {
    return res.status(403).json({
      success: false,
      code: error.code,
      message: error.message,
      remaining: error.remaining,
      requiredPlan: error.requiredPlan,
      upgradeUrl: error.upgradeUrl,
    });
  }
  console.error("[custom-syllabus] request failed:", error);
  return res.status(500).json({
    success: false,
    message: "The syllabus request could not be completed. Please try again.",
  });
};

export async function listCustomSyllabi(req: Request, res: Response) {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const data = await getTeacherSyllabi(userId(req), query);
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getCustomSyllabus(req: Request, res: Response) {
  try {
    const requested = syllabusId(req);
    const data = await getSyllabusTree(requested, userId(req));
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function searchCustomSyllabus(req: Request, res: Response) {
  try {
    const rawType = typeof req.query.type === "string" ? req.query.type : "";
    const type =
      rawType === "syllabus" || rawType === "chapter" || rawType === "topic"
        ? (rawType as SyllabusSearchType)
        : null;
    if (rawType && !type) {
      throw new SyllabusServiceError(
        400,
        "Search type must be syllabus, chapter, or topic.",
        "INVALID_SEARCH_TYPE"
      );
    }
    const data = await searchSyllabusCatalog(userId(req), {
      query: typeof req.query.q === "string" ? req.query.q : "",
      type,
      syllabusId: optionalPositiveInt(req.query.syllabus_id, "syllabus"),
      chapterId: optionalPositiveInt(req.query.chapter_id, "chapter"),
      limit: optionalPositiveInt(req.query.limit, "limit") ?? undefined,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createCustomSyllabus(req: Request, res: Response) {
  try {
    const data = await createTeacherSyllabus(userId(req), req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function updateCustomSyllabus(req: Request, res: Response) {
  try {
    const data = await updateTeacherSyllabus(userId(req), syllabusId(req), req.body);
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function renameCustomSyllabus(req: Request, res: Response) {
  try {
    const data = await renameTeacherSyllabus(
      userId(req),
      syllabusId(req),
      typeof req.body?.name === "string" ? req.body.name : ""
    );
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteCustomSyllabus(req: Request, res: Response) {
  try {
    await deleteTeacherSyllabus(userId(req), syllabusId(req));
    return res.json({ success: true, data: { id: syllabusId(req) } });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getSyllabusImportCost(_req: Request, res: Response) {
  try {
    return res.json({ success: true, data: getSyllabusImportCostInfo() });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function startCustomSyllabusImport(req: Request, res: Response) {
  try {
    if (!req.file) {
      throw new SyllabusServiceError(400, "Please attach one syllabus document.", "FILE_REQUIRED");
    }
    const data = await startSyllabusImport({
      teacherId: userId(req),
      file: {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
      },
    });
    return res.status(202).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getCustomSyllabusImportJob(req: Request, res: Response) {
  try {
    const jobId = String(req.params.jobId ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
      throw new SyllabusServiceError(400, "Select a valid import job.", "INVALID_IMPORT_JOB");
    }
    const data = await getSyllabusImportJob(userId(req), jobId);
    return res.json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function streamCustomSyllabusImport(req: Request, res: Response) {
  try {
    const teacherId = userId(req);
    const jobId = String(req.params.jobId ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
      throw new SyllabusServiceError(400, "Select a valid import job.", "INVALID_IMPORT_JOB");
    }
    const job = await getSyllabusImportJob(teacherId, jobId);

    res.status(200).set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    let closed = false;
    let unsubscribe: (() => void) | null = null;
    let heartbeat: NodeJS.Timeout | null = null;
    const send = (event: string, data: unknown) => {
      if (closed || res.writableEnded) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const cleanup = () => {
      if (closed) return;
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
      if (!res.writableEnded) res.end();
    };

    heartbeat = setInterval(() => {
      if (closed || res.writableEnded) return;
      res.write(": keep-alive\n\n");
    }, 15_000);
    unsubscribe = subscribeSyllabusImportStream(jobId, (event) => {
      if (event.type === "delta") {
        send("delta", { text: event.text });
        return;
      }
      send("done", {
        status: event.status,
        errorMessage: event.errorMessage ?? null,
      });
      cleanup();
    });
    req.on("close", cleanup);
    res.on("close", cleanup);

    if (job.streamText) send("snapshot", { text: job.streamText });
    if (job.status === "ready" || job.status === "failed") {
      send("done", {
        status: job.status,
        errorMessage: job.errorMessage,
      });
      cleanup();
    }
  } catch (error) {
    return sendError(res, error);
  }
}
