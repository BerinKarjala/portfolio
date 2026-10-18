export const COMPONENTS = [
  {
    type: "container",
    name: "Container",
    category: "Layout",
    hint: "Nest elements in Flex or Grid",
  },
  {
    type: "heading",
    name: "Heading",
    category: "Text",
    hint: "Give your section a title",
  },
  {
    type: "paragraph",
    name: "Paragraph",
    category: "Text",
    hint: "Tell your story",
  },
  {
    type: "link",
    name: "Link",
    category: "Text",
    hint: "Connect to a page or section",
  },
  {
    type: "divider",
    name: "Divider",
    category: "Layout",
    hint: "Separate sections",
  },
  {
    type: "image",
    name: "Image",
    category: "Media",
    hint: "Use an externally hosted image",
  },
  {
    type: "nav",
    name: "Navigation",
    category: "Layout",
    hint: "A container for links",
  },
  {
    type: "list",
    name: "List",
    category: "Text",
    hint: "A container for list items",
  },
  {
    type: "listItem",
    name: "List item",
    category: "Text",
    hint: "Insert inside a list",
  },
  ...[
    ["button", "Button", "Text", "A prominent link with a clear action"],
    ["card", "Card", "Layout", "A reusable content container"],
    ["form", "Form", "Forms", "Labels, fields and an external HTTPS endpoint"],
    ["table", "Table", "Data", "Semantic rows, columns and headers"],
    ["gallery", "Gallery", "Media", "An ordered responsive image collection"],
    ["icon", "Icon", "Media", "Searchable original inline SVG icons"],
    ["video", "Video", "Media", "A hosted video with native controls"],
    ["audio", "Audio", "Media", "Hosted audio with native controls"],
    ["embed", "Embed", "Media", "Trusted YouTube, Vimeo and Maps URLs"],
  ].map(([type, name, category, hint]) => ({ type, name, category, hint })),
];
export const isContainer = (element) =>
  !!element && ["container", "card", "nav", "list"].includes(element.type);
export const canContain = (parent, type) =>
  parent?.type === "list"
    ? type === "listItem"
    : parent?.type === "nav"
      ? ["link", "button"].includes(type)
      : (!parent || ["container", "card"].includes(parent.type)) &&
        type !== "listItem";
