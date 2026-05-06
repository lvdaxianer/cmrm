import { describe, it } from 'vitest';
import inquirer from 'inquirer';

describe('debug inquirer', () => {
  it('should log inquirer structure', async () => {
    const dyn = await import('inquirer');
    console.log('static import keys:', Object.keys(inquirer));
    console.log('static import prompt:', typeof (inquirer as any).prompt);
    console.log('dynamic import keys:', Object.keys(dyn));
    console.log('dynamic import default.prompt:', typeof (dyn as any).default?.prompt);
    console.log('dynamic import prompt:', typeof (dyn as any).prompt);
  });
});
