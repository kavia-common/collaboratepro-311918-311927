const { query } = require('./pool');

/**
 * PUBLIC_INTERFACE
 * Bootstrap database schema (idempotent).
 * Creates required tables if they do not exist.
 */
async function bootstrapDatabase() {
  // Users
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Organizations
  await query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Organization memberships (simple)
  await query(`
    CREATE TABLE IF NOT EXISTS organization_memberships (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, organization_id)
    );
  `);

  // Projects
  await query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Tasks
  await query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      assignee_user_id INT REFERENCES users(id) ON DELETE SET NULL,
      due_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Activity log
  await query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      actor_user_id INT REFERENCES users(id) ON DELETE SET NULL,
      organization_id INT REFERENCES organizations(id) ON DELETE SET NULL,
      project_id INT REFERENCES projects(id) ON DELETE SET NULL,
      task_id INT REFERENCES tasks(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Simple trigger to update tasks.updated_at
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_set_updated_at'
      ) THEN
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $fn$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;

        CREATE TRIGGER tasks_set_updated_at
        BEFORE UPDATE ON tasks
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;
    END
    $$;
  `);
}

module.exports = {
  bootstrapDatabase,
};
