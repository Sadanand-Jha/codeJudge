import type { Request, Response } from "express";
import { pool } from "../app.ts";

// ================================================
// Profile Location Controllers
// ------------------------------------------------
// All handlers for the `/user/profile/*` route group
// live in this file. They operate on the `country`,
// `state`, `college` tables and update the logged-in
// user's `country_id`, `state_id` and `college_id`.
// ================================================

/**
 * GET /api/v1/user/profile/countries
 * Returns every available country (id + name).
 */
export const getCountries = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM country ORDER BY name ASC"
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching countries",
    });
  }
};

/**
 * GET /api/v1/user/profile/states?countryId=1
 * Returns the states that belong to a given country.
 */
export const getStatesByCountry = async (req: Request, res: Response) => {
  try {
    const countryId = parseInt(req.query.countryId as string, 10);

    if (!countryId || isNaN(countryId)) {
      res.status(400).json({
        success: false,
        message: "Invalid or missing countryId query parameter",
      });
      return;
    }

    const country = await pool.query("SELECT 1 FROM country WHERE id = $1", [
      countryId,
    ]);
    if (country.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Country not found",
      });
      return;
    }

    const result = await pool.query(
      "SELECT id, name, country_id FROM state WHERE country_id = $1 ORDER BY name ASC",
      [countryId]
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching states:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching states",
    });
  }
};

/**
 * GET /api/v1/user/profile/colleges?stateId=1
 * Returns the colleges that belong to a given state.
 */
export const getCollegesByState = async (req: Request, res: Response) => {
  try {
    const stateId = parseInt(req.query.stateId as string, 10);

    if (!stateId || isNaN(stateId)) {
      res.status(400).json({
        success: false,
        message: "Invalid or missing stateId query parameter",
      });
      return;
    }

    const state = await pool.query("SELECT 1 FROM state WHERE id = $1", [
      stateId,
    ]);
    if (state.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "State not found",
      });
      return;
    }

    const result = await pool.query(
      "SELECT id, name, state_id FROM college WHERE state_id = $1 ORDER BY name ASC",
      [stateId]
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching colleges:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching colleges",
    });
  }
};

/**
 * PATCH /api/v1/user/profile/location
 * Updates the authenticated user's country_id / state_id / college_id.
 *
 * Body (all optional, at least one required):
 *   { countryId?, stateId?, collegeId? }
 *
 * Validation: references must exist and remain logically consistent
 * (state belongs to selected country, college belongs to selected state).
 */
export const updateUserLocation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
      return;
    }

    const { countryId, stateId, collegeId } = req.body ?? {};

    // Coerce to integers; null means "don't touch this field"
    const parsedCountryId =
      countryId === undefined || countryId === null ? null : Number(countryId);
    const parsedStateId =
      stateId === undefined || stateId === null ? null : Number(stateId);
    const parsedCollegeId =
      collegeId === undefined || collegeId === null ? null : Number(collegeId);

    if (
      parsedCountryId === null &&
      parsedStateId === null &&
      parsedCollegeId === null
    ) {
      res.status(400).json({
        success: false,
        message: "At least one of countryId, stateId or collegeId is required",
      });
      return;
    }

    if (
      (parsedCountryId !== null && Number.isNaN(parsedCountryId)) ||
      (parsedStateId !== null && Number.isNaN(parsedStateId)) ||
      (parsedCollegeId !== null && Number.isNaN(parsedCollegeId))
    ) {
      res.status(400).json({
        success: false,
        message: "countryId, stateId and collegeId must be valid integers",
      });
      return;
    }


    // ---- Validate the supplied ids ----
    if (parsedCountryId !== null) {
      const country = await pool.query(
        "SELECT 1 FROM country WHERE id = $1",
        [parsedCountryId]
      );
      if (country.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Country not found",
        });
        return;
      }
    }

    if (parsedStateId !== null) {
      const state = await pool.query(
        "SELECT id, country_id FROM state WHERE id = $1",
        [parsedStateId]
      );
      if (state.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "State not found",
        });
        return;
      }
      if (parsedCountryId !== null && state.rows[0].country_id !== parsedCountryId) {
        res.status(400).json({
          success: false,
          message: "State does not belong to the selected country",
        });
        return;
      }
    }

    if (parsedCollegeId !== null) {
      const college = await pool.query(
        "SELECT id, state_id FROM college WHERE id = $1",
        [parsedCollegeId]
      );
      if (college.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "College not found",
        });
        return;
      }
      if (parsedStateId !== null && college.rows[0].state_id !== parsedStateId) {
        res.status(400).json({
          success: false,
          message: "College does not belong to the selected state",
        });
        return;
      }
    }

    // ---- Build the dynamic UPDATE ----
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (parsedCountryId !== null) {
      sets.push(`country_id = $${idx++}`);
      values.push(parsedCountryId);
    }
    if (parsedStateId !== null) {
      sets.push(`state_id = $${idx++}`);
      values.push(parsedStateId);
    }
    if (parsedCollegeId !== null) {
      sets.push(`college_id = $${idx++}`);
      values.push(parsedCollegeId);
    }

    sets.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE users
      SET ${sets.join(", ")}
      WHERE id = $${idx}
      RETURNING id, country_id, state_id, college_id
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const updated = result.rows[0];
    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: {
        countryId: updated.country_id,
        stateId: updated.state_id,
        collegeId: updated.college_id,
      },
    });
  } catch (error) {
    console.error("Error updating user location:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating user location",
    });
  }
};

