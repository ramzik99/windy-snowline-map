# Windy data inspector

This is a completely separate diagnostic plugin. It does not import or modify the main Snow forecast plugin.

## Run on Windows

```bat
cd inspector
npm install
npm start
```

The inspector dev server uses:

```text
https://localhost:9998
```

Accept the local self-signed certificate warning if prompted, then load this development plugin in Windy using the inspector URL/port.

## What it does

Click or tap a point on the Windy map. The inspector shows and logs:

- every field returned by the ECMWF meteogram/point forecast response;
- fields whose names contain `snow`, `depth`, `hsnow`, `h-snow`, `snowcover`, etc.;
- precipitation-like fields;
- array lengths and the first 10 raw values, without unit conversion;
- Windy map elevation;
- current `overlay`, `product`, `level`, `timestamp`, `availLevels` and `metric` store values;
- raw output from the currently available map interpolator;
- the complete raw point response in the browser console.

Use **Copy report** or **Save TXT** and send the report back for analysis.

## Snow-depth test

For the most useful test:

1. Inspect a point where ECMWF has lying snow.
2. Save/copy the report with your normal map overlay active.
3. Switch Windy to the **Snow depth** overlay at the same point and time.
4. Inspect the same point again.
5. Compare the two reports.

This reveals whether snow depth exists in the point payload, only in loaded map tiles/interpolator data, or under an unexpected field name.
