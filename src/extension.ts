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
  });

  context.subscriptions.push(disposable);
}

function generate(path, folderPath, fileName) {
  if (folderPath) {
    const folders = folderPath.split("/");
    let tempPath = "";

    if (folders)
      folders.forEach(f => {
        if (!fs.existsSync(f)) {
          tempPath += `/${f}`;
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
  const className = fileName.charAt(0).toUpperCase() + fileName.slice(1);
  const upperName = fileName.toUpperCase();

  //#region Action
  const actionText = `import { Action } from '@ngrx/store';
  
  export const FETCH = "[${upperName}] Fetch ${fileName}";
  export const FETCH_SUCCESS = "[${upperName}] Fetch ${fileName} success";

  
  export class Fetch implements Action {
	readonly type = FETCH;
  
	constructor() { }
  }
  
  export class FetchSuccess implements Action {
	readonly type = FETCH_SUCCESS;
  
	constructor(public items: any[]) {}
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
	items: any[];
  }
  
  const initialState: ${className}State = {
	items: [],
	loading${className}: false,
  };
  
  export function ${fileName}Reducer(state: ${className}State, action: ${className}Actions.Actions): ${className}State {
	switch(action.type) {
	  case ${className}Actions.FETCH:
		return { ...state, items: [], loading${className}: true }
	  case ${className}Actions.FETCH_SUCCESS:
		return { ...state, items: action.items, loading${className}: false }
  
	  default:
		return { ...state }
	}
  }
  `;
  createFile("reducer", reducerText);
  //#endregion

  //#region Effects
  const effectsText = `import { Injectable } from "@angular/core";
  import { UserService } from "./user.service";
  import { Store } from "@ngrx/store";
  import { AppState } from "src/app/app.state";
  import { ToastrService } from "ngx-toastr";
  import { Observable, of } from "rxjs";
  import { createEffect, ofType, Actions } from "@ngrx/effects";
  import { map, delay, switchMap, catchError } from "rxjs/operators";
  
  import * as ${className}Actions from "./${fileName}.actions";
  import * as ErrorActions from "@shared/actions/error.actions";
  
  import { ${className}Service } from "@shared/services/${fileName}.service";
  
  @Injectable()
  export class ${className}Effects {
	constructor(private _actions: Actions, private _store: Store<AppState>, private _toastr: ToastrService, private _${fileName}s: ${className}Service) { }
  
	fetch${className}: Observable<ErrorActions.Set | ${className}Actions.FetchSuccess> = createEffect(() =>
	  this._actions.pipe(
		ofType(${className}Actions.FETCH),
		switchMap((search) => {
		  return this._${fileName}s.fetch(search).pipe(
			map(res => {
			  if (res) {
				return new ${className}Actions.FetchSuccess(res as any[]);
			  }
			}),
			catchError((err) => {
			  return of(new ErrorActions.Set({
				message: "${className}s not fetched.",
				type: "${upperName}_FETCH_FAILURE",
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
  
	fetch(): Observable<void> {
	  return this._http.get<void>(\`\${environment.apiURL}/api/${fileName}s\`);
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
	]
  })
  export class ${className}Module { }
  `;

  createFile("module", moduleText);
  //#endregion

  function createFile(type: string, text: string) {
    fs.writeFile(`${path}/${fileName}.${type}.ts`, text, "utf8", err => {
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
