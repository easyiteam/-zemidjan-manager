// Crée ou met à jour un compte (gérant/manager). Pas d'auto-inscription dans
// l'appli : c'est le seul moyen de provisionner un utilisateur.
//
// Usage : node dist/scripts/seed-user.js <email> <mot-de-passe> <nom complet>
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import { PasswordService } from "../auth/password.service";

async function main() {
  const [email, password, ...nameParts] = process.argv.slice(2);
  const name = nameParts.join(" ");
  if (!email || !password || !name) {
    console.error("Usage : node dist/scripts/seed-user.js <email> <mot-de-passe> <nom complet>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Le mot de passe doit contenir au moins 8 caractères.");
    process.exit(1);
  }

  const url = process.env.APP_DATABASE_URL;
  if (!url) throw new Error("APP_DATABASE_URL manquant");
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const passwords = new PasswordService();

  try {
    const passwordHash = await passwords.hash(password);
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, name },
      create: { email, passwordHash, name },
    });
    console.log(`[seed-user] compte prêt : ${user.email} (${user.name})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed-user] échec :", err);
  process.exit(1);
});
