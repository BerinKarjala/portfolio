import AdSense from 'react-adsense'

function Adsense() {
    return (
        <AdSense.Google
        client='pub-3336553805044512'
        slot='8275811156'
        style={{ display: 'block' }}
        format='auto'
        responsive='true'
        layoutKey='-gw-1+2a-9x+5c'
      />
    )
}
export default Adsense
//The following code should be cut and pasted into the Head element of the index.html <script data-ad-client="ca-pub-3336553805044512" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>