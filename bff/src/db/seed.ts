import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import * as schema from "./schema.js";
import { ROLE_TEMPLATES } from "../lib/permissions.js";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://control:control@localhost:5432/control_ui";
const sql = postgres(DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("🌱 Seeding database...");

  // Create platform admin user
  const passwordHash = await bcrypt.hash("admin123", 10);
  const [adminUser] = await db.insert(schema.users).values({
    email: "admin@robotai.cloud",
    displayName: "Platform Admin",
    status: "active",
    isPlatformAdmin: true,
    passwordHash,
    idpProvider: "local",
  }).onConflictDoNothing().returning();

  if (adminUser) {
    console.log("✅ Platform admin created:", adminUser.email);
  }

  // Create default tenant
  const [defaultTenant] = await db.insert(schema.tenants).values({
    slug: "default",
    name: "Default Tenant",
    contactEmail: "admin@robotai.cloud",
    status: "active",
    quotas: { maxConcurrentSessions: 50, maxQps: 100, maxDailyRequests: 10000, maxCrons: 20 },
    policies: { allowExec: false, allowPluginInstall: false, allowWebFetch: true, logRetentionDays: 90 },
  }).onConflictDoNothing().returning();

  if (defaultTenant && adminUser) {
    // Add admin to tenant
    await db.insert(schema.tenantMembers).values({
      tenantId: defaultTenant.id,
      userId: adminUser.id,
      status: "active",
    }).onConflictDoNothing();

    // Create role templates
    for (const [key, tmpl] of Object.entries(ROLE_TEMPLATES)) {
      const [role] = await db.insert(schema.roles).values({
        tenantId: key.startsWith("platform") ? null : defaultTenant.id,
        name: key,
        displayName: tmpl.displayName,
        permissions: tmpl.permissions,
        isSystem: true,
      }).onConflictDoNothing().returning();

      // Assign tenant-admin role to platform admin
      if (role && key === "tenant-admin") {
        await db.insert(schema.userRoles).values({
          userId: adminUser.id,
          roleId: role.id,
          tenantId: defaultTenant.id,
        }).onConflictDoNothing();
      }
    }
    console.log("✅ Default tenant and roles created");
  }

  console.log("🌱 Seed complete!");
  await sql.end();
}

seed().catch(console.error);
