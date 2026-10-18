// Immutable starter content. M3 adds the complete design/component inventory.
const starters = [
  {
    id: "blank",
    name: "Blank",
    description: "A clean page, ready for your ideas.",
    accent: "#166534",
    sections: [],
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Introduce yourself and share selected work.",
    accent: "#166534",
    sections: [
      [
        "CREATE / CONNECT / EXPLORE",
        "Thoughtful work. Lasting impressions.",
        "I'm Alex, an independent designer building useful digital experiences.",
        "Explore my work",
      ],
      [
        "SELECTED WORK",
        "Ideas made tangible.",
        "A collection of experiments in design, storytelling, and the web.",
      ],
      [
        "LET'S TALK",
        "Have something in mind?",
        "Good work begins with a conversation.",
        "Get in touch",
      ],
    ],
  },
  {
    id: "landing",
    name: "Landing",
    description: "A focused introduction to your next big idea.",
    accent: "#4338ca",
    sections: [
      [
        "MEET STUDIO",
        "Make room for your next idea.",
        "A calmer way to plan, create, and share the work that matters.",
        "Discover Studio",
      ],
      [
        "LESS FRICTION",
        "From possibility to progress.",
        "Simple tools. Clear priorities. Space to do your best work.",
      ],
      [
        "START SOMETHING",
        "Your next chapter starts here.",
        "Bring your ideas together in one thoughtful space.",
        "Learn more",
      ],
    ],
  },
  {
    id: "business",
    name: "Business",
    description: "Tell your story and introduce your services.",
    accent: "#075985",
    sections: [
      [
        "NORTH & CO.",
        "Good people. Considered solutions.",
        "An independent studio helping ambitious businesses move forward.",
        "Meet the studio",
      ],
      [
        "WHAT WE DO",
        "Strategy meets craft.",
        "Research, identity, and digital experiences shaped around your goals.",
      ],
      [
        "WORK WITH US",
        "Let's build something useful.",
        "Tell us where you want to go. We'll help find the way.",
        "Start a conversation",
      ],
    ],
  },
  {
    id: "blog",
    name: "Blog",
    description: "A quiet home for stories, notes, and observations.",
    accent: "#92400e",
    sections: [
      [
        "FIELD NOTES",
        "Small observations. Bigger ideas.",
        "Notes on creativity, everyday discoveries, and making things well.",
      ],
      [
        "ESSAY / 01",
        "The value of paying attention.",
        "Sometimes the most interesting ideas are hiding in the details.",
      ],
      [
        "ESSAY / 02",
        "A little space to think.",
        "On slowing down, finding perspective, and beginning again.",
      ],
    ],
  },
  {
    id: "contact",
    name: "Contact",
    description: "Make a warm introduction and invite a conversation.",
    accent: "#9d174d",
    sections: [
      [
        "SAY HELLO",
        "Good things start with a conversation.",
        "Have a question, a project, or simply something to share? I'd love to hear it.",
        "Email the studio",
      ],
      [
        "FIND ME",
        "Open to new possibilities.",
        "Working independently. Connecting with people everywhere.",
      ],
    ],
  },
  {
    id: "gallery",
    name: "Gallery",
    description: "A collection of original shapes, color, and stories.",
    accent: "#6b21a8",
    sections: [
      [
        "A STUDY IN COLOR",
        "A different way of seeing.",
        "A small collection of visual experiments and everyday inspiration.",
      ],
      [
        "COLLECTION / 01",
        "Light & form.",
        "Finding rhythm in simple shapes and unexpected combinations.",
      ],
      [
        "COLLECTION / 02",
        "Between the lines.",
        "An exploration of balance, contrast, and the spaces in between.",
      ],
    ],
  },
];

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export const TEMPLATES = freeze(starters);
