'use strict';

const e = React.createElement;

class suggestor extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: null,
            isLoaded: false,
            myData: {},
        };
    }

    componentDidMount() {
        const symbol = window.location.search.split('symbol=')[1];

        fetch(`/get_tasty_options/${symbol}`)
            .then((res) => res.json())
            .then(
                (myData) => {
                    this.setState({
                        isLoaded: true,
                        myData,
                    });
                },
                (error) => {
                    this.setState({
                        isLoaded: true,
                        error,
                    });
                },
            );
    }

    handleBuy(optionSymbol, bid, ask) {
        fetch(`/buy_tasty_option/${optionSymbol}/${bid}/${ask}`)
            .then((res) => res.json())
            .then(
                (myData) => {
                    console.log(myData);
                },
                (error) => {
                    this.setState({
                        isLoaded: true,
                        error,
                    });
                },
            );
    }

    optionContainer(options) {
        const currBias = this.state.myData.bias;

        return options.map((option, i) => (
            <div className="option" key={`option_${i}`}>
                <div>{option.description}</div>
                <div>{option.symbol}</div>
                <div>
                    ${option.bid} x ${option.ask} {option.isITM ? <code>ITM</code> : null}
                </div>
                <div>mark: ${option.mark}</div>
                <div>strikePrice: {option.strikePrice}</div>
                <div>stockPrice: {option.stockPrice}</div>
                <div>theoretical: {option.theoretical}</div>
                <div>volatility: {option.volatility}</div>
                <div>openInterest: {option.openInterest}</div>
                <div>totalVolume: {option.totalVolume}</div>
                <div>markWingDiff: {option.markWingDiff}</div>
                <div>wing: {option.wing}</div>
                {/* {currBias.longCallSymbol === option.symbol || currBias.longPutSymbol === option.symbol ? (
                    <code>My Position</code>
                ) : (
                    <button onClick={() => this.handleBuy(option.symbol, option.bid, option.ask)}>BUY</button>
                )} */}
            </div>
        ));
    }

    render() {
        const { error, isLoaded, myData } = this.state;
        const { longCallSuggestions, longPutSuggestions, shortCallSuggestions, shortPutSuggestions, bias } = myData || null;
        const goodBuyCalls = longCallSuggestions || [];
        const goodSellCalls = shortCallSuggestions || [];
        const goodBuyPuts = longPutSuggestions || [];
        const goodSellPuts = shortPutSuggestions || [];

        if (error) {
            console.log(error);
        }

        return isLoaded ? (
            <div>
                <div>
                    <code>{JSON.stringify(bias)}</code>
                </div>
                <div id="uiContainer">
                    <div>
                        <h2>goodBuyCalls</h2>
                        {this.optionContainer(goodBuyCalls)}
                    </div>
                    <div>
                        <h2>goodSellCalls</h2>
                        {this.optionContainer(goodSellCalls)}
                    </div>
                    <div>
                        <h2>goodBuyPuts</h2>
                        {this.optionContainer(goodBuyPuts)}
                    </div>
                    <div>
                        <h2>goodSellPuts</h2>
                        {this.optionContainer(goodSellPuts)}
                    </div>
                </div>
            </div>
        ) : (
            <h1>LOADING...</h1>
        );
    }
}

const domContainer = document.querySelector('#root');
const root = ReactDOM.createRoot(domContainer);
root.render(e(suggestor));
