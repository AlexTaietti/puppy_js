# Puppy

Puppy is a puppeteer based scraper so it uses an headless version of Chromium it ships with, and which is the only version guarateed to work with the library, that being said it can be hooked up to any browser.

Using an headless browser is necessary since any website worth scraping is gonna need to be populated with data by running some client side js after getting its HTML.

-----

### How it works

This web scraper is far from being perfect but it's a good start and with a bit more work it could become very useful I feel, here's how it works: The crawler class is the one that manages all the active pages/tabs during a scraping run. You can feed two types of pages to it, either `BrutePage` or `CrawlerPage`, the former simply ploughs through an array of urls (even an array containing a single page can be useful) and will probably run into rate limit issues unless it's `discreet` property is set to true. The latter is a bit more careful and will make its way through the Web almost like a person would (clicking anchor tags, typing, wasting time, etc...) tho it can also be slowed down with the same `discreet` property/flag the `BrutePage` has.

After creating a page and assigning it an id (which is required) you can then run it individually or simultaneously with as many other pages as you'd like. A good thing about this scraper is the fact that you can chain runs (you'll find examples of this in the `examples` folder) that way you can use the results extracted by a page to create a map used in a subsequent run.

When the run is finished the crawler will simply return a JSON object containing an array of result objects. Every result object contains a `url` property (the location this data entry was extracted from) and a `results` property, which contains label->data pairs extracted.

NOTE: this scraper's `CrawlerPage` uses recursion to navigate and search the web along with a ton of promises, so it can be susceptible to heap overflow if the navigation conditions are not specific enough.

-----
### The map object
This crawler is not the smartest so the best solution I could find was to provide it with a map describing the kinds of pages it's gonna find during each run, and once we reach a matching url use the generic description of the location to generate a more precise set of actions based on the actual page we are looking at. The idea being that even without AI we could create and maintain some useful maps that can then be updated and refined if needed. Here's the shape of the map object:

```ts
exampleMap: {
	"https://www.example.com":{
		navigation?: <navigation description>, //anchor tag handling
		extraction?: <data extraction description>,
		setup?: <setup description>, //getting rid of policy/cookie dropdowns that might be in the way when accessing a webpage
		search?: <search description>,
		exact?: boolean, //consider this object only if the current url is exactly "https://www.example.com"
		starts?: boolean //consider this object only if the current url start with "https://www.example.com"
	},
	"https://www.some-other-example.com":{
		navigation?: <navigation description>,
		extraction?: <data extraction description>,
		setup?: <setup description>,
		search?: <search description>,
		exact?: boolean,
		starts?: boolean
	}
}

//note: if neither "exact" nor "starts" are set to true the default behavior is to match any url which contains the fragment
```
If a url does not match any of the url fragments provided the crawler will simply back track and look for a new url it can interact with.

----

#### navigation description:

```ts

{
	targetFilter?: {
		exclude?: string[], //url fragments that the crawler should not interact with
		include?: string[] //url fragments that the crawler is allowed to interact with
	};
	selectors: string[]; //normal css selectors or even something less likely to change on a webpage like p[data-important="some-important-value"]
}

```
The crawler looks for filter strings (if provided) inside the href string of the anchor tag it is about to click.

----

#### extraction description:

```ts
//NOTE: currently an array of these needs to be supplied even if is has length of just 1 (meaning you want to extract only one piece of data from the whole page you are describing)
{
   selector: string; //main css selector (even multiple matches are allowed)
   label?: string;   //label for the data extracted using the above selector
   relative?: {      //very rarely used, the crawler will use the selector above as a root from which to run a relative search
      label: string; //css selector relative to the main selector
      data: string;  //css selector relative to the main selector
   };
   attribute?: string;     //optionally provide an attribute whose value you want to extract from the matching elements (you could extract the value of "href" for example, instead of the default text extraction)
   filterFunction?: (data: string) => boolean;   //used to filter results as they get extracted
   transformFunction?: (data: string) => string; //used to transform results as they get extracted
}

```

There's a bit of error handling so even if, for whatever reason, we don't match all the data or none at all the crawler will not stop.

-----
#### setup description:

```ts
//NOTE: currently an array of these needs to be supplied even if is has length of just 1
//NOTE: the order of the setup entries is actually important as they get executed one after the other
{
	type: 'click' | 'select' | 'type'; //type is not supported yet
	selectors: string[];               //list of css selectors that the crawler needs to interact with
	option?: string;                   // only used with "select" type (option to be picked in a select HTML element)
	wait?: number | PuppeteerLifeCycleEvent; //either the number of ms we have to wait for the interaction to take effect or one of puppeteer's default wait events
	onlyOnce?: true | 'done';
}
```

This part specifies what the crawler should do as soon as it reaches a new page that might require some preparation (e.g.:dismissing cookie/policy drop downs).

For now it only supports clicks and select inputs but can be extended.

-----
#### search description:


```ts
{
	selector: string[],
	inputs: (string | string[])[]
}
```

The crawler will use this object to determine which inputs it can use to run searches. For example if you want to look up on google the string "hello" you'd write an object like: `{ selector: ['input[name="q"]'], inputs: ['hello'] }`. The crawler also supports multiple search fields, here's an example:  
  
```ts
{
	selector: ['input[name="firstName"]', 'input[name="lastName"]'],
	inputs: [['John', 'Doe'], ['Some', 'Dude']]
}
```

----

Apart from the map object and a handful of methods (which I have added comments to) everything else is pretty straight forward, the `examples` folder contains quite a few scripts you can play with. You can simply import them into the `index.ts` at the root of the `src` folder and run `yarn build`.

NOTE: There isn't a way of saving a run's data to a database yet, at the moment data gets saved to a json file inside a folder called `results` at the root of the project (it gets generated automatically, no need to create it).
