
One of my inspirations for this game was the Gurobi burrito game. I would encourage you to play it some to get a feel for what works about it.
https://burrito.gurobi.com/burrito-game

One thing I liked about the burrito game, is that it strategically uses font sizes and central pop-up boxes to focus the user's attention.


## TODO

- I think the font size for the frequency, total gen, and reserves should be quite larger, since these are the critical metrics people need to focus on (and the time as well). I would also have a larger minimum font size in general.

The visuals of the map and the colors are really important and probably need to be thought through some more:
- Loads being a different shape (square) helps make them clearly distinguished from generators.
- In the original I used brighter, bolder colors compared to the more muted colors of this version. I also have a slight white outline to the generator icons to make them stand out.

I love the load types: RCI and data centers. That's a nice addition:
- The totals of the RCID loads in "Grid Health" don't seem to match the sum of the individual loads. For example, I tripped all the data center loads and the total did not reflect that.



## COMPLETE AND ADDRESSED FULLY

I think the start and end of each day should have a visual pop-up in the center of the screen, to make it obvious the need to focus on it. The first time I played this new version it took me a while to figure out how to start the day, with the button in the lower left corner.

- Only change would be that in the description of data centers, change "power-hungry" for a more neutral point of view
- We need to see substation names at the default zoom level to make following the hints easier.
- The orange thermal plants are too close to yellow (solar) and red (outaged) that it isn't as visually distinguished to me as gray.
- Grid health needs section headers "Generation" and "Load". 
- There seems to be a bug in the double circuit lines. When you open one of the lines the flow on that circuit does not show as zero.