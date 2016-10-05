#!/usr/bin/env node
'use strict';

const _ = require('lodash');
const meow = require('meow');
const path = require('path');
const updateNotifier = require('update-notifier');
const chalk = require('chalk');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const xml2js = require('xml2js');
const parser = new xml2js.Parser();
const Table = require('cli-table');

const usageText = fs.readFileSync(path.join(__dirname, 'usage.txt'), 'utf8');
const cli = meow(usageText);

const notifier = updateNotifier(cli).notify();

if (cli.input.length < 2) {
	console.log(cli.help);
	process.exit(0);
}

_.forEach(cli.input, function (value, key) {
	console.log(chalk.green('F' + key + ' - ' + value));
});
console.log();
console.log();


return getFileContent(cli.input).then(function (dataFiles) {

	const objectFiles = [];
	let numberFile = 0;

	return Promise.map(dataFiles, function (data) {
		const object = {};

		_.forEach(data['TokensManifest']['tokens-definition'], function (tokens) {
			_.forEach(tokens['token'], function (value) {
				object[value['$'].name] = {};
				object[value['$'].name][numberFile] = {};

				if (value['$'].type) {
					object[value['$'].name][numberFile].type = value['$'].type;
				}
				if (value['$'].defaultValue) {
					object[value['$'].name][numberFile].defaultValue = value['$'].defaultValue;
				}
			});
		});

		_.forEach(data['TokensManifest']['values'], function (values) {
			_.forEach(values['environment'], function (value) {
				_.forEach(value.token, function (token) {
					object[token['$'].name][numberFile].value = token['$'].value;
				});
			});
		});

		objectFiles.push(object);
		numberFile = numberFile + 1;
	}).then(function () {
		const objectMerge = _.merge.apply(null, objectFiles);

		_.forEach(objectMerge, function (value, key) {
			const table = new Table();
			table.push(['file id', 'type', 'value', 'defaultValue']);
			const valuesOnlyDiff = [];
			_.forEach(value, function (data, fileId) {
				valuesOnlyDiff.push(data.value);
				table.push(['F' + fileId, data.type || '', data.value || '', data.defaultValue || '']);
			});

			let show = true;
			if (cli.flags.onlyDiff && _.size(_.uniq(valuesOnlyDiff)) === 1) {
				show = false;
			}

			if (show) {
				console.log(key);
				console.log(table.toString());
				console.log();
			}
		});
	});
});


function getFileContent(input) {
	return Promise.map(input, function (pathFile) {
		return fs.readFileAsync(pathFile)
			.then((data) => Promise.fromCallback((callback) => parser.parseString(data, callback)));
	}).catch(function (err) {
		console.error(chalk.red(err));
		process.exit(1);
	});
}
