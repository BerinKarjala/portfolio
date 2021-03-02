
import React, {Component} from 'react'
import Sprite from '../sprite'

class RPG extends Component {
    componentDidMount(){
        //did mount functions
        const hello = document.querySelector("#buckle")
        hello.innerHTML="hello world"
        
    }
    render(){
        return(
            <div className='main'>
                <h1 id="buckle"></h1>
                <Sprite />
            </div>
        )
    }
}
export default RPG