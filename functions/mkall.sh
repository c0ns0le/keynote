#!/bin/bash

cat video.js > all.js
cat json-parser.js >> all.js

./compress.py all.js
