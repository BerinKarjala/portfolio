import React, { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import sanityClient from "../client.js"
import imageUrlBuilder from "@sanity/image-url";
import BlockContent from "@sanity/block-content-to-react"
import getYouTubeId from 'get-youtube-id'
import YouTube from 'react-youtube'

const builder = imageUrlBuilder(sanityClient)
function urlFor(source){
    return builder.image(source)
}

const serializers = {
    types: {
      youtube: ({node}) => {
        const { url } = node
        const id = getYouTubeId(url)
        return(<YouTube videoId={id} />)
      }
    }
  };

export default function SinglePost(blocks){
    const [singlePost, setSinglePost] = useState(null)
    const {slug} = useParams()

    useEffect(()=>{
        sanityClient.fetch(`*[slug.current=="${slug}"]{
            title,
            _id,
            slug,
            mainImage{
                asset->{
                    _id,
                    url
                }
            },
            body,
            "name": author->name,
            "authorImage": author->image,
            youtube
        }`).then((data) => setSinglePost(data[0])).catch(console.error)
    }, [slug]);
    if (!singlePost) return <div>Loading...</div>
    
    return (
        <main className="forest-bg px-4 sm:px-6 md:px-10 lg:px-12 py-12">
            <article className="relative">
                <header className="relative">
                    <div className="absolute h-full w-full flex items-center justify-center p-8">
                        <div className="bg-white bg-opacity-75 rounded p-12">
                            <h1 className="cursive text-3xl lg:text-6xl mb-4">
                                {singlePost.title}
                            </h1>
                            <div className="flex justify-center text-gray-800">
                                <img src={urlFor(singlePost.authorImage).url()} alt={singlePost.name}
                                className="w-10 h-10 rounded-full" />
                                <p></p>    
                            </div>
                             
                        </div>
                    </div>
                    <img src={singlePost.mainImage.asset.url} alt={singlePost.title} className="w-full object-cover rounded-t" style={{height: "400px"}} />
                </header>
                <div className="px-16 lg:px-48 py-12 lg:py-20 prose lg:prose-xl max-w-full">
                    <BlockContent blocks={singlePost.body} projectId="jp1px5kh" dataset="production" serializers={serializers} />
                </div>
            </article>
        </main>
    )
}
