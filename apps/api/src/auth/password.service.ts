import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

const ARGON2_OPTS: argon2.Options = { type: argon2.argon2id };

// Hash valide précalculé d'un mot de passe arbitraire, utilisé pour que la
// vérification d'un email inconnu prenne le même temps qu'un mot de passe
// invalide (évite de révéler l'existence d'un compte par timing).
let dummyHash: string | null = null;

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTS);
  }

  verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  async verifyOrDummy(hash: string | null, password: string): Promise<boolean> {
    if (hash) return this.verify(hash, password);
    dummyHash ??= await this.hash("dummy-password-constant-time");
    await this.verify(dummyHash, password).catch(() => false);
    return false;
  }
}
