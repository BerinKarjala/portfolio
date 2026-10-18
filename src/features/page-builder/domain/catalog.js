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
];
export const isContainer = (element) =>
  !!element && ["container", "nav", "list"].includes(element.type);
export const canContain = (parent, type) =>
  parent?.type === "list"
    ? type === "listItem"
    : parent?.type === "nav"
      ? type === "link"
      : (!parent || parent.type === "container") && type !== "listItem";
