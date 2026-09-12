/**
 * The three personas the user can switch between in the chat.
 *
 * A persona changes voice and depth only. It must never change which workflows
 * run, which sources are used, or what the numbers say - two personas asked the
 * same question have to agree on the facts and differ only in how they put
 * them. That rule is why `voice` below rewrites the framing around a reply
 * rather than the reply itself.
 *
 * TODO(user): confirm the CK bot definition. It is written here as the plain
 * default voice; if CK means something specific in the thesis, this copy and
 * its lead-in line need replacing.
 */

import type { PersonaId } from "../api/types";

export interface Persona {
  id: PersonaId;
  name: string;
  /** One line under the name in the picker. */
  tagline: string;
  /** What actually changes when it is selected - shown in the picker. */
  behaviour: string;
  /** Stub-only: the line the agents open with in this voice. */
  lead: string;
  /** Stub-only: optional closing line. */
  close?: string;
}

export const PERSONAS: Persona[] = [
  {
    id: "ck_bot",
    name: "CK bot",
    tagline: "Plain and neutral",
    behaviour:
      "Explains what was done and what it means, in ordinary language. No " +
      "jargon unless the jargon is the point. The default.",
    lead: "Here is what came back.",
  },
  {
    id: "chanakya",
    name: "Chanakya",
    tagline: "Strategic and terse",
    behaviour:
      "Answers a planner, not a scientist. Leads with the decision and the " +
      "risk, keeps the method out of the way, and says plainly when the " +
      "evidence will not carry a decision.",
    lead: "The short of it:",
    close: "Act on what is certain; hold what is not.",
  },
  {
    id: "norwood",
    name: "Agent Norwood",
    tagline: "Earth-observation specialist",
    behaviour:
      "Answers in sensor terms - platforms, bands, thresholds, revisit - and " +
      "states the caveats an EO reader would expect to see.",
    lead: "Reading this as an EO problem:",
  },
];

export const DEFAULT_PERSONA: PersonaId = "ck_bot";

export const personaInfo = (id: PersonaId): Persona =>
  PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
