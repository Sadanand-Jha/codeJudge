import { pool } from "./../app.ts";

export class userRepository {
    /**
     * Finds the latest OTP for a given username.
     * @param username - The username to search for.
     * @returns The latest OTP record or null if not found.
     */
    static async findLatestOTP(username: string) {
       const query = `
        select * from otp where username = $1 order by createdat desc limit 1
        `;
        const result = await pool.query(query, [username]);
        if (result.rows.length > 0) {
            return result.rows[0]; // Return the latest OTP record
        }
        return null; // Return null if no OTP record is found
    }   
    static async createOrUpdateOTP(username: string, otp: string, attemptCount: number, currentTime: Date, verifyAttemptCount: number) {
        const existingOTP = await this.findLatestOTP(username);
        if (existingOTP) {
            // Update existing OTP record
            const updateQuery = `
                update otp set otp = $1, attempt = $2, createdat = $3, verifyattempt = $5 where username = $4
            `;
            await pool.query(updateQuery, [otp, attemptCount, currentTime, username, verifyAttemptCount]);
        } else {
            // Create new OTP record
            const insertQuery = `
                insert into otp (username, otp, attempt, createdat, verifyattempt) values ($1, $2, $3, $4, $5)
            `;
            await pool.query(insertQuery, [username, otp, attemptCount, currentTime, verifyAttemptCount]);
        }
        
    }
    static async getEmailByUsername(username: string): Promise<string | null> {
        const query = `
            select email from users where username = $1
        `;
        const result = await pool.query(query, [username]);
        if (result.rows.length > 0) {
            return result.rows[0].email; // Return the email associated with the username
        }
        return null; // Return null if no user is found
    }
}