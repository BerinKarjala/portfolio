import { defineArrayMember, defineField, defineType } from 'sanity'

export default defineType({
  name: "project",
  title: "Project",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
    }),
    defineField({
      name: "date",
      type: "datetime",
    }),
    defineField({
      name: "place",
      type: "string",
    }),
    defineField({
      name: "description",
      type: "text",
    }),
    defineField({
      name: "projectType",
      title: "Project type",
      type: "string",
      options: {
        list: [
          {value: "personal", title: "Personal"},
          {value: "client", title: "Client"},
          {value: "school", title: "School"},
        ],
      },
    }),
    defineField({
      name: "link",
      type: "string",
    }),
    defineField({
      name: "tags",
      type: "array",
      of: [
        defineArrayMember({type: "string"}),
      ],
      options: {
        layout: "tags",
      },
    }),
  ],
})
