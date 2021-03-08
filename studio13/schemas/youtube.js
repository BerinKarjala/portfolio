import React from 'react'
import getYouTubeID from 'get-youtube-id'

const YouTubePreview = ({value}) => {
    
    const id=getYouTubeID(value.url)
    const url=`https://www.youtube.com/embed/${id}`
    if(!id){
        return <div>Missing YouTube URL</div>
    }
        return(
            <iframe
            title="YouTube Preview" 
            width="560"
            height= "315"
            src={url}
            frameborder="0"
            allow="accelerometer; autoplay; encryped-media; gyroscope; picture-in-picture"
            />
        )
}

export default {
    name: 'youtube',
    type: 'object',
    title: 'YouTube Embed',
    fields: [
        {
        name: 'url',
        type: 'url',
        title: 'URL'
        }
    ],
    preview: {
        select: {
            url: 'url'
        },
        component: YouTubePreview,
    }
}