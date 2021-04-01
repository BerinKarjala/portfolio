
import React, {Component} from 'react'
import Sprite from '../sprite'

class RPG extends Component {
    componentDidMount(){
        //did mount functions
        const hello = document.querySelector("#buckle")
        const sprite = "Hello"+<Sprite />
       
        
    }
    render(){
        return(
            <div className='main'>
                <h1 id="buckle"></h1>
                
            </div>
        )
    }
}
export default RPG