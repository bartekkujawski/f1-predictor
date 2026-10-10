import { randomInt } from "node:crypto";

// A Join Code is the short code that lets a Player join a League (CONTEXT.md).

// Letters and digits that cannot be mistaken for each other when the code is typed by hand:
// no 0/O and no 1/I/L.
const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const JOIN_CODE_LENGTH = 8;

// Random from a cryptographic source, so a Join Code cannot be guessed from another one.
export const generateJoinCode = (): string =>
  Array.from({ length: JOIN_CODE_LENGTH }, () => JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)]).join("");

// Join Codes are generated in uppercase; a code typed by hand may not be, or may carry spaces.
export const normalizeJoinCode = (typed: string): string => typed.trim().toUpperCase();
