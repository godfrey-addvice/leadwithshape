import type { SymbolKind } from "./symbols";

export interface Reflection {
  role: string;
  tagline: string;
  description: string;
  strengths: string[];
  watchFor: string;
  verse: { reference: string; text: string };
  question: string;
}

export const REFLECTIONS: Record<SymbolKind, Reflection> = {
  triangle: {
    role: "The Leader",
    tagline: "Points the way forward.",
    description:
      "Triangles have a point — and so do triangle people. You may naturally see where things need to go and feel energized rallying others toward a goal.",
    strengths: ["Casts vision", "Makes decisions", "Brings momentum"],
    watchFor: "Remember to bring people along, not just get there first.",
    verse: { reference: "Nehemiah 2:18", text: "Let us rise up and build." },
    question: "When have you stepped up to point the way for others?",
  },
  square: {
    role: "The Organizer",
    tagline: "Builds the structure that holds.",
    description:
      "Squares are steady and dependable. You may love a clear plan, a tidy process and the satisfaction of seeing the details done well.",
    strengths: ["Plans ahead", "Keeps commitments", "Creates order"],
    watchFor: "Leave room for surprises — not everything fits in a box.",
    verse: { reference: "1 Corinthians 14:40", text: "Let all things be done decently and in order." },
    question: "What structure or habit have you built that helps others thrive?",
  },
  circle: {
    role: "The Harmonizer",
    tagline: "Keeps everyone connected.",
    description:
      "Circles have no sharp edges. You may be the one who notices how people are feeling, draws others in and helps a team stay united.",
    strengths: ["Builds trust", "Listens well", "Includes others"],
    watchFor: "Peacemaking isn't the same as avoiding hard conversations.",
    verse: {
      reference: "Matthew 5:9",
      text: "Blessed are the peacemakers: for they shall be called the children of God.",
    },
    question: "How do you help people feel they belong?",
  },
  squiggle: {
    role: "The Innovator",
    tagline: "Imagines what could be.",
    description:
      "Squiggles refuse to stay in straight lines. You may love fresh ideas, creative problem-solving and asking “what if we tried…?”",
    strengths: ["Sparks ideas", "Adapts quickly", "Sees possibilities"],
    watchFor: "Great ideas still need follow-through — partner with a square!",
    verse: {
      reference: "Isaiah 43:19",
      text: "Behold, I will do a new thing; now it shall spring forth.",
    },
    question: "Where might God be inviting you to try something new?",
  },
};

export const GROUP_PROMPTS = [
  "Show your picture. What did you make, and what does it mean to you?",
  "Which symbol did you double? Does that description feel true of you — or not quite?",
  "Which symbol do you most appreciate in the people you lead or serve alongside?",
  "Which symbol would you like to grow in this season?",
];