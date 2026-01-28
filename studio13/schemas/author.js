import { defineArrayMember, defineField, defineType } from 'sanity'
import CertificateInput from '../components/CertificateInput'

export default defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'array',
      of: [
        defineArrayMember({
          title: 'Block',
          type: 'block',
          styles: [{title: 'cNormal', value: 'normal'}],
          lists: [],
        }),
      ],
    }),
    defineField({
      name: 'certificates',
      title: 'Certificates',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'certificate',
          title: 'Certificate',
          type: 'object',
          components: {
            input: CertificateInput,
          },
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'kind',
              title: 'Kind',
              type: 'string',
              options: {
                list: [
                  { title: 'Image', value: 'image' },
                  { title: 'PDF', value: 'pdf' },
                ],
                layout: 'radio',
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: { hotspot: true },
              hidden: ({ parent }) => parent?.kind !== 'image',
            }),
            defineField({
              name: 'pdf',
              title: 'PDF',
              type: 'file',
              options: { accept: 'application/pdf' },
              hidden: ({ parent }) => parent?.kind !== 'pdf',
            }),
            defineField({
              name: 'thumbnail',
              title: 'Thumbnail (optional)',
              type: 'image',
              options: { hotspot: true },
            }),
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
            }),
            defineField({
              name: 'issuedBy',
              title: 'Issued by',
              type: 'string',
            }),
            defineField({
              name: 'issuedDate',
              title: 'Issued date',
              type: 'date',
            }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Author',
      }
    },
  },
})
