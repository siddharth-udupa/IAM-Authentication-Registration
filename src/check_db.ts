import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

async function inspectTable() {
  try {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'otps';
    `;
    console.log('OTPS Columns:', JSON.stringify(columns, null, 2));
  } catch (err) {
    console.error('Error querying columns:', err);
  } finally {
    await sql.end();
  }
}

inspectTable();
