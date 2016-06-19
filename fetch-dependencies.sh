#!/bin/sh

cd server
npm install

cd ../site
bower install
npm install

