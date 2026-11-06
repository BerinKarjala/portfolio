import { defineField, defineType } from "sanity";

export default defineType({
  name: "project",
  title: "Project",
  type: "document",
  preview: {
    select: { title: "name", media: "thumbnail" },
  },
  fields: [
    defineField({
      name: "kind",
      title: "Project action",
      type: "string",
      description: "Select CSS Studio to open its tools or Page Builder to identify that card; leave empty for an ordinary project link.",
      options: {
        list: [
          { title: "Project link", value: "link" },
          { title: "HTML Page Builder", value: "pageBuilder" },
          { title: "CSS Theme Studio", value: "cssStudio" },
        ],
      },
    }),
    defineField({
      name: "name",
      title: "Project name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      type: "text",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "thumbnail",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alt text",
        }),
      ],
    }),
    defineField({
      name: "link",
      type: "url",
      validation: (Rule) =>
        Rule.uri({
          scheme: ["http", "https"],
          allowRelative: true,
        }).custom((value) => {
          if (typeof value !== "string" || value === "") return true;

          // Browsers can treat these as external URLs even when they look like paths.
          if (/[\\\u0000-\u001f\u007f]/.test(value) || value.trimStart().startsWith("//")) {
            return "Use an internal path or a full HTTP(S) URL without backslashes or control characters.";
          }
          return true;
        }),
    }),
  ],
});
