import React from 'react'
import getYouTubeId from 'get-youtube-id'
import YouTube from 'react-youtube'
import { defineField, defineType } from 'sanity'

const YouTubePreview = ({value}) => {
  const {url} = value || {}
  const id = url ? getYouTubeId(url) : null
  if (!id) {
    return <div>Missing YouTube URL</div>
  }
  return <YouTube videoId={id} />
}

export default defineType({
  name: 'youtube',
  type: 'object',
  title: 'YouTube Embed',
  fields: [
    defineField({
      name: 'url',
      type: 'url',
      title: 'YouTube video URL',
    }),
  ],
  preview: {
    select: {
      url: 'url',
    },
    component: YouTubePreview,
  },
})
