// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { Installer, ProgressObject } from '@electron/fiddle-core';
import { Runner } from '@electron/fiddle-core';

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
        let lastPercent = 0;
        const callback = (progressObj: ProgressObject) => {
          const currentPercent = progressObj.percent * 100;
          const increment = currentPercent - lastPercent;
          lastPercent = currentPercent;
          
          progress.report({ 
            message: `${currentPercent.toFixed(0)}%`,
            increment: increment > 0 ? increment : undefined
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

// Function to run a fiddle with a specific Electron version
async function runFiddle(version: string, fiddlePath: string | vscode.Uri): Promise<void> {
  try {
    // Convert vscode.Uri to string if needed
    const fiddlePathStr = typeof fiddlePath === 'string' 
      ? fiddlePath 
      : fiddlePath.fsPath;
    
    // Create the runner
    const runner = await Runner.create();
    
    // Show progress notification
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Running fiddle with Electron ${version}`,
      cancellable: true
    }, async (progress, token) => {
      progress.report({ message: 'Starting...' });
      
      // Run the fiddle
      const result = await runner.run(version, fiddlePathStr);
      
      progress.report({ message: 'Complete' });
      
      // Process result (assuming result has some properties we can check)
      if (result) {
        vscode.window.showInformationMessage(`Fiddle ran successfully with Electron ${version}`);
      }
      
      return result;
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to run fiddle with Electron ${version}: ${error}`);
  }
}

// Function to bisect an issue between Electron versions
async function bisectElectron(startVersion: string, endVersion: string, fiddlePath: string | vscode.Uri): Promise<void> {
  try {
    // Convert vscode.Uri to string if needed
    const fiddlePathStr = typeof fiddlePath === 'string' 
      ? fiddlePath 
      : fiddlePath.fsPath;
    
    // Create the runner
    const runner = await Runner.create();
    
    // Show progress notification for bisect operation
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Bisecting Electron ${startVersion} to ${endVersion}`,
      cancellable: true
    }, async (progress, token) => {
      progress.report({ message: 'Starting bisect...' });
      
      // Run the bisect
      const result = await runner.bisect(startVersion, endVersion, fiddlePathStr);
      
      // Display the result
      if (result) {
        // Assuming the result has a first property with version information
        // (adjust according to actual BisectResult structure)
        const badVersion = typeof result === 'string' ? result : 'unknown';
        const message = `Bisect complete. First bad version: ${badVersion}`;
        vscode.window.showInformationMessage(message);
        
        // Create an output channel to show detailed results
        const outputChannel = vscode.window.createOutputChannel('Electron Bisect Results');
        outputChannel.appendLine(message);
        outputChannel.appendLine('');
        outputChannel.appendLine('Bisect Details:');
        outputChannel.appendLine(JSON.stringify(result, null, 2));
        outputChannel.show();
      }
      
      return result;
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Bisect failed: ${error}`);
  }
}

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  console.log('Congratulations, your extension "fiddle-ext" is now active!');

  // Hello World command
  const helloWorldCommand = vscode.commands.registerCommand('fiddle-ext.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World from Fiddle!');
  });

  // Install Electron command
  const installElectronCommand = vscode.commands.registerCommand('fiddle-ext.installElectron', async () => {
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
  
  // Remove Electron command
  const removeElectronCommand = vscode.commands.registerCommand('fiddle-ext.removeElectron', async () => {
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

  // Run Fiddle command
  const runFiddleCommand = vscode.commands.registerCommand('fiddle-ext.runFiddle', async () => {
    // Get the active workspace folder
    let fiddlePath: string | undefined;
    
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      fiddlePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    } else {
      // If no workspace is open, prompt for a path
      const selectedFolder = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Fiddle Folder'
      });
      
      if (selectedFolder && selectedFolder.length > 0) {
        fiddlePath = selectedFolder[0].fsPath;
      } else {
        return; // User cancelled
      }
    }
    
    // Prompt for Electron version
    const version = await vscode.window.showInputBox({
      placeHolder: '12.0.15',
      prompt: 'Enter Electron version to run with'
    });
    
    if (version && fiddlePath) {
      await runFiddle(version, fiddlePath);
    }
  });
  
  // Bisect command
  const bisectCommand = vscode.commands.registerCommand('fiddle-ext.bisect', async () => {
    // Get the active workspace folder
    let fiddlePath: string | undefined;
    
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      fiddlePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    } else {
      // If no workspace is open, prompt for a path
      const selectedFolder = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Fiddle Folder'
      });
      
      if (selectedFolder && selectedFolder.length > 0) {
        fiddlePath = selectedFolder[0].fsPath;
      } else {
        return; // User cancelled
      }
    }
    
    // Prompt for start version
    const startVersion = await vscode.window.showInputBox({
      placeHolder: '10.0.0',
      prompt: 'Enter starting Electron version (good version)'
    });
    
    // Prompt for end version
    const endVersion = await vscode.window.showInputBox({
      placeHolder: '13.1.7',
      prompt: 'Enter ending Electron version (bad version)'
    });
    
    if (startVersion && endVersion && fiddlePath) {
      await bisectElectron(startVersion, endVersion, fiddlePath);
    }
  });
  
  // Register the command to run a gist
  const runGistCommand = vscode.commands.registerCommand('fiddle-ext.importGist', async () => {
    // Prompt for gist ID
    const gistId = await vscode.window.showInputBox({
      prompt: 'Enter Gist ID'
    });
    
    // Prompt for Electron version
    const version = await vscode.window.showInputBox({
      placeHolder: '12.0.15',
      prompt: 'Enter Electron version to run with'
    });
    
    if (gistId && version) {
      try {
        // Create the runner
        const runner = await Runner.create();
        
        // Show progress notification
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: `Running gist with Electron ${version}`,
          cancellable: true
        }, async (progress) => {
          progress.report({ message: 'Starting...' });
          
          // Run the gist
          const result = await runner.run(version, gistId);
          
          progress.report({ message: 'Complete' });
          
          if (result) {
            vscode.window.showInformationMessage(`Gist ran successfully with Electron ${version}`);
          }
          
          return result;
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to run gist with Electron ${version}: ${error}`);
      }
    }
  });

  context.subscriptions.push(helloWorldCommand);
  context.subscriptions.push(installElectronCommand);
  context.subscriptions.push(removeElectronCommand);
  context.subscriptions.push(runFiddleCommand);
  context.subscriptions.push(bisectCommand);
  context.subscriptions.push(runGistCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}