import React from 'react'

export default function Sprite(){
    return <div 
        style ={{
            display: "inline-block",
            height: "32px",
            width: "32px",
            backgroundImage: "url(../sprite/m1.png)",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "0px 0px",
            border: "solid thin black"
        }}
    />
}