// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import { createInflate } from "zlib";
//const fs = require("fs");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "ngrx-essentials-generator" is now active!');

  vscode.commands.executeCommand("setContext", "inAngularProject", true);

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand("extension.generateBoilerplateForNgrx", context => {
    //console.log("Context", getContextPath(context));
    try {
      // The code you place here will be executed every time your command is executed
      vscode.window.showInputBox().then(value => {
        console.log(value, getContextPath(context));

        if (value != undefined) {
          let path = value.substring(0, value.lastIndexOf("/"));

          const fileName = value.split("/").pop();

          const contextPath = getContextPath(context);

          if (contextPath) {
            generate(contextPath, path, fileName);
          } else {
            generate(vscode.workspace.rootPath, path, fileName);
          }
        }
      });
    } catch (ex) {
      console.error(ex);
      vscode.window.showErrorMessage(ex);
    }
  });

  context.subscriptions.push(disposable);
}

function generate(path, folderPath, fileName) {
  if (folderPath) {
    //if (!fs.existsSync(`${path}/${folderPath}`)) fs.mkdirSync(`${path}/${folderPath}`, { recursive: true });
    const folders = folderPath.split("/");
    let tempPath = "";

    if (folders)
      folders.forEach(f => {
        tempPath += `/${f}`;
        if (!fs.existsSync(`${path}${tempPath}`)) {
          
          fs.mkdirSync(`${path}${tempPath}`);
        }
      });
  }
  if (fileName) {
    if (folderPath) generateFiles(`${path}/${folderPath}`, fileName);
    else generateFiles(`${path}`, fileName);
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}

function generateFiles(path: string, fileName: string) {
  const camelCased = fileName.replace(/-([a-z])/g, function(g) {
    return g[1].toUpperCase();
  });
  const className = camelCased.charAt(0).toUpperCase() + camelCased.slice(1);
  const upperName = camelCased.toUpperCase();
  const readableName = fileName
    .split("-")
    .reduce((acc, x) => (acc = `${acc} ${x}`), "")
    .slice(1);
  const readableNameWithUpper = readableName.charAt(0).toUpperCase() + readableName.slice(1);
  const fileNameWithUnderscore = fileName.replace(/-/g, "_").toUpperCase();

  //#region Component.ts
  const componentTsText = `
  import { Component, OnInit } from '@angular/core';
  import { BaseComponent } from '@shared/components/base.component';
  import * as SharedActions from '@shared/actions/shared.actions';
  import * as ${className}Actions from './${fileName}.actions';
  
  @Component({
      selector: 'app-${fileName}',
      templateUrl: './${fileName}.component.html',
      styleUrls: ['./${fileName}.component.scss']
  })
  export class ${className}Component extends BaseComponent implements OnInit {
      constructor() {
          super();
      }
  
      ngOnInit(): void {
      }
  }
  
  `;

  createFile("component", componentTsText);
  //#endregion

  //#region Component.scss
  const componentScssText = `

  `;

  createFile("component", componentScssText,"scss");
  //#endregion

  //#region Component.html
  const componentHtmlText = `
    <p>${fileName} foken works mate</p>
  `;

  createFile("component", componentHtmlText,"html");
  //#endregion

  //#region Action
  const actionText = `import { Action } from '@ngrx/store';
  
  export const FETCH = "[${readableName.toUpperCase()}] Fetch ${readableName}";
  export const FETCH_SUCCESS = "[${readableName.toUpperCase()}] Fetch ${readableName} success";

  
  export class Fetch implements Action {
	readonly type = FETCH;
  
	constructor(public search: any) { }
  }
  
  export class FetchSuccess implements Action {
	readonly type = FETCH_SUCCESS;
  
	constructor(public list: any[]) {}
  }
  
  export type Actions =
	Fetch | FetchSuccess
  `;

  createFile("actions", actionText);
  //#endregion

  //#region Reducer
  const reducerText = `
  import * as ${className}Actions from './${fileName}.actions';
  
  export interface ${className}State {
	  loading${className}: boolean;
	  list: any[];
  }
  
  const initialState: ${className}State = {
    list: [],
	  loading${className}: false,
  };
  
  export function ${camelCased}Reducer(state: ${className}State = initialState, action: ${className}Actions.Actions): ${className}State {
	switch(action.type) {
	  case ${className}Actions.FETCH:
		return { ...state, list: [], loading${className}: true }
	  case ${className}Actions.FETCH_SUCCESS:
		return { ...state, list: action.list, loading${className}: false }
  
	  default:
		return { ...state }
	}
  }
  `;
  createFile("reducer", reducerText);
  //#endregion

  //#region Effects
  const effectsText = `import { Injectable } from "@angular/core";
  import { Store } from "@ngrx/store";
  import { AppState } from "src/app/app.state";
  import { ToastrService } from "ngx-toastr";
  import { Observable, of } from "rxjs";
  import { createEffect, ofType, Actions } from "@ngrx/effects";
  import { map, delay, switchMap, catchError } from "rxjs/operators";
  
  import * as ${className}Actions from "./${fileName}.actions";
  import * as ErrorActions from "@shared/actions/error.actions";
  
  import { ${className}Service } from "./${fileName}.service";
  
  @Injectable()
  export class ${className}Effects {
	constructor(private _actions: Actions, private _store: Store<AppState>, private _toastr: ToastrService, private _${camelCased}s: ${className}Service) { }
  
	fetch${className}: Observable<ErrorActions.Set | ${className}Actions.FetchSuccess> = createEffect(() =>
	  this._actions.pipe(
		ofType(${className}Actions.FETCH),
		switchMap((search) => {
		  return this._${camelCased}s.fetch(search).pipe(
			map(res => {
			  if (res) {
				return new ${className}Actions.FetchSuccess(res as any[]);
			  }
			}),
			catchError((err) => {
			  return of(new ErrorActions.Set({
				message: "${readableNameWithUpper} not fetched.",
				type: "${fileNameWithUnderscore}_FETCH_FAILURE",
				baseError: err
			  }));
			})
		  );
		})
	  )
	);
  }
  `;

  createFile("effects", effectsText);
  //#endregion

  //#region Service
  const serviceText = `import { Injectable } from "@angular/core";
  import { HttpClient } from '@angular/common/http';
  import { environment } from 'src/environments/environment';
  import { Observable } from 'rxjs';
  
  @Injectable({
	providedIn: "root"
  })
  
  export class ${className}Service {
	constructor(private _http: HttpClient) {}
  
	fetch(search): Observable<any> {
	  return this._http.get<any>(\`\${environment.apiURL}/api/${fileName[fileName.length - 1] == "s" ? fileName : fileName + "s"}\`);
	}
  }`;

  createFile("service", serviceText);
  //#endregion

  //#region Module

  const moduleText = `import { NgModule } from '@angular/core';
  import { SharedModule } from '@shared/modules/shared.module';
  
  @NgModule({
	imports: [
	  SharedModule
	],
	declarations: [
    ${className}Component
	]
  })
  export class ${className}Module { }
  `;

  createFile("module", moduleText);
  //#endregion

  function createFile(type: string, text: string, extension:string = "ts") {
    fs.writeFile(`${path}/${fileName}.${type}.${extension}`, text, "utf8", err => {
      if (err) console.error(err);
      else vscode.window.showInformationMessage(`File ${fileName}.${type}.ts created.`);
    });
  }
}

export interface ExplorerMenuContext {
  fsPath: string;
}

function getContextPath(context?: ExplorerMenuContext): string {
  /* Check if there is an Explorer context (command could be launched from Palette too, where there is no context) */
  return typeof context === "object" && context !== null && "path" in context ? context["fsPath"] : "";
}
