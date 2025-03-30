// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Installer, ProgressObject } from '@electron/fiddle-core';

// Function to handle Electron installation
async function installElectron(version: string, showProgress = true): Promise<string | undefined> {
  try {
    const installer = new Installer();
    
    // Create progress notification if showProgress is true
    if (showProgress) {
      return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Installing Electron ${version}`,
        cancellable: true
      }, async (progress, token) => {
        const callback = (progressObj: ProgressObject) => {
			const percent = progressObj.percent * 100;
			
			// Report just the current percentage without trying to use delta
			progress.report({ 
			  message: `${percent.toFixed(0)}%`
			});
		};
        
        // Setup state change listener
        installer.on('state-changed', ({version: ver, state}) => {
          vscode.window.setStatusBarMessage(`Electron ${ver}: ${state}`, 3000);
        });
        
        // Start the download/installation
        const execPath = await installer.install(version, {
          progressCallback: callback
        });
        
        return execPath;
      });
    } else {
      // Simple installation without progress reporting
      return await installer.install(version);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to install Electron ${version}: ${error}`);
    return undefined;
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "fiddle-ext" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const helloWorldCommand = vscode.commands.registerCommand('fiddle-ext.helloWorld', () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    vscode.window.showInformationMessage('Hello World from Fiddle!');
  });

  // Register install Electron command
  const installElectronCommand = vscode.commands.registerCommand('fiddle-ext.installElectron', async () => {
    // Prompt user for version
    const version = await vscode.window.showInputBox({
      placeHolder: '12.0.15',
      prompt: 'Enter Electron version to install'
    });
    
    if (version) {
      const execPath = await installElectron(version);
      if (execPath) {
        vscode.window.showInformationMessage(`Electron ${version} installed successfully!`);
      }
    }
  });
  
  // Register command to remove a downloaded Electron version
  const removeElectronCommand = vscode.commands.registerCommand('fiddle-ext.removeElectron', async () => {
    // Prompt user for version
    const version = await vscode.window.showInputBox({
      prompt: 'Enter Electron version to remove'
    });
    
    if (version) {
      try {
        const installer = new Installer();
        await installer.remove(version);
        vscode.window.showInformationMessage(`Electron ${version} removed successfully!`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to remove Electron ${version}: ${error}`);
      }
    }
  });

  context.subscriptions.push(helloWorldCommand);
  context.subscriptions.push(installElectronCommand);
  context.subscriptions.push(removeElectronCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}