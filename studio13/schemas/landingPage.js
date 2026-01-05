import { defineArrayMember, defineField, defineType } from 'sanity'

export default defineType({
  name: 'landingPage',
  title: 'Landing Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Headline',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'strengthsTitle',
      title: 'Strengths Heading',
      type: 'string',
      initialValue: 'Core strengths',
    }),
    defineField({
      name: 'strengths',
      title: 'Strengths List',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'content',
      title: 'Rich Content',
      type: 'blockContent',
      description: 'Supports rich text, inline links, images, and YouTube embeds.',
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA Button Label',
      type: 'string',
      initialValue: 'Contact Me',
    }),
    defineField({
      name: 'ctaHelper',
      title: 'CTA Helper Text',
      type: 'string',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'tagline',
    },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Landing Page',
        subtitle,
      }
    },
  },
})
