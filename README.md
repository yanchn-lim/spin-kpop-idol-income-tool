# Spin a KPOP Idol Tools

A small experiment to see whether the game's visible stats can be reverse-engineered.

The tool calculates idol income, compares mutations, explores fusion recipes, and tracks observed weight ranges from screenshots. The data is incomplete and may change as more evidence is collected.

This is not an official game tool or a definitive source of game data.

## Game

[Spin a KPOP Idol by the community of love](https://www.roblox.com/games/95115629288532/Spin-a-KPOP-Idol)

## Running it

Open `index.html` in a browser. Keep `styles.css`, `data.js`, `app.js`, `planner.js`, and the `vendor` folder beside it. No setup or network connection is required.

## Mutation planner

In Fusion recipes, select the mutations already on the card and the types available for direct application. The planner searches reachable combinations with one to four slots and returns the highest multiplier. Equal multipliers use the fewest actions.

The model permits one copy of each mutation, consumes fusion ingredients, and treats selected direct sources as unlimited repeat applications. Individual removal is optional and off by default. Selecting a crafted or event mutation as a direct source is an assumption that it can be applied directly. The festive preset adds Ghostly and Hallow, whose application rules remain unconfirmed. Quantities, application costs, and random outcomes are not modeled.

The planner uses the locally bundled [Graphlib 4.0.7](https://github.com/dagrejs/graphlib) library and its [Dijkstra shortest-path algorithm](https://github.com/dagrejs/graphlib/wiki/API-Reference#algdijkstragraph-source-weightfn-edgefn). Its MIT license is included in `vendor/graphlib-LICENSE.txt`.
