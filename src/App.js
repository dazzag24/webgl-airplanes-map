import React, { Component } from "react";
import "./App.css";
import DeckGL, { IconLayer } from "deck.gl";
import { StaticMap } from "react-map-gl";
import * as d3 from "d3";

import Airplane from "./airplane-icon.jpg";
import destinationPoint from "./destinationPoint";

// Set your mapbox access token here
const MAPBOX_ACCESS_TOKEN = 
    "pk.eyJ1Ijoic3dpemVjIiwiYSI6ImNqcHdnaDR1MDB0bWozeG1tY28wcHVoM2UifQ.RxzaHH4i1_U32eiWoOc_jQ";

// Initial viewport settings
const initialViewState = {
    longitude: 0.0,
    latitude: 52.0,
    zoom: 5,
    pitch: 0,
    bearing: 0
};

class App extends Component {
    state = {
        airplanes: []
    };
    currentFrame = null;
    timer = null;
    fetchEverySeconds = 10;
    framesPerFetch = this.fetchEverySeconds * 30; // 30fps, 10 second intervals

    componentDidMount() {
        this.fetchData();
    }

    fetchData = () => {
        //d3.json("https://opensky-network.org/api/states/all?").then(
        d3.json("https://opensky-network.org/api/states/all?lamin=43.069&lomin=-13.975&lamax=61.164&lomax=30.806").then(
            ({ states }) =>
                this.setState(
                    {
                        // from https://opensky-network.org/apidoc/rest.html#response
                        airplanes: states.map(d => ({
                            icao24: d[0],
                            callsign: d[1],
                            longitude: d[5],
                            latitude: d[6],
                            velocity: d[9],
                            altitude: d[13],
                            origin_country: d[2],
                            true_track: -d[10],
                            interpolatePos: d3.geoInterpolate(
                                [d[5], d[6]],
                                destinationPoint(
                                    d[5],
                                    d[6],
                                    d[9] * this.fetchEverySeconds, // Speed x time = distance
                                    d[10]
                                )
                            )
                        }))
                    },
                    () => {
                        this.startAnimation();
                        setTimeout(
                            this.fetchData,
                            this.fetchEverySeconds * 1000
                        );
                    }
                )
        );
    };

    startAnimation = () => {
        if (this.timer) {
            this.timer.stop();
        }
        this.currentFrame = 0;
        this.timer = d3.timer(this.animationFrame);
    };

    animationFrame = () => {
        let { airplanes } = this.state;
        airplanes = airplanes.map(d => {
            const [longitude, latitude] = d.interpolatePos(
                this.currentFrame / this.framesPerFetch
            );
            return {
                ...d,
                longitude,
                latitude
            };
        });
        this.currentFrame += 1;
        this.setState({ airplanes });
    };

    _renderTooltip() {
        const {hoveredObject, pointerX, pointerY} = this.state || {};
        return hoveredObject && (
          <div style={{position: 'absolute', zIndex: 1, pointerEvents: 'none', left: pointerX, top: pointerY}}>
            ICAO24: { hoveredObject.icao24 } <br></br>
            Callsign: { hoveredObject.callsign } <br></br>
            Country: { hoveredObject.origin_country } <br></br>
            Velocity: { hoveredObject.velocity } <br></br>
            Track: { hoveredObject.true_track } 
          </div>
        );
      }

    render() {
        const layers = [
            // http://deck.gl/#/documentation/deckgl-api-reference/layers/icon-layer
            new IconLayer({
                id: "airplanes",
                data: this.state.airplanes,
                pickable: true,
                iconAtlas: Airplane,
                iconMapping: {
                    airplane: {
                        x: 0,
                        y: 0,
                        width: 512,
                        height: 512
                    }
                },
                sizeScale: 20,
                getPosition: d => [d.longitude, d.latitude],
                getIcon: d => "airplane",
                getAngle: d => 45 + d.true_track,
                onHover: info => this.setState({
                    hoveredObject: info.object,
                    pointerX: info.x,
                    pointerY: info.y
                  })
                //onHover: info => console.log('Hovered:', info),
            })
        ];

        return (
            <DeckGL 
                initialViewState={initialViewState}
                controller={true}
                layers={layers} >
            { this._renderTooltip() }
                <StaticMap 
                    mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN} 
                    mapStyle="mapbox://styles/mapbox/satellite-streets-v10"/>
            </DeckGL>
        );
    }
}

export default App;
