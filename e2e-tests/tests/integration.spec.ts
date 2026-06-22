import { test, expect } from '@playwright/test';

test.describe('Gitea & Jenkins Integration', () => {

  // Run tests sequentially to ensure Jenkins is ready before Gitea triggers webhooks
  test.describe.configure({ mode: 'serial' });

  test('1. Verify Jenkins and create job via UI', async ({ page }) => {
    // 1. Go to Jenkins
    await page.goto('http://localhost:8080');
    await expect(page).toHaveTitle(/Jenkins/);
    
    // 2. Create a new Job
    await page.goto('http://localhost:8080/newJob');
    await page.fill('#name', 'test-job');
    await page.click('text=Freestyle project');
    await page.click('#ok-button');
    
    // Wait for configuration page
    await page.waitForSelector('text=General');
    
    // Check "This project is parameterized"
    await page.check('input[name="hudson-model-ParametersDefinitionProperty"]');
    
    // Add String Parameter for GITEA_EVENT
    await page.click('button:has-text("Add Parameter")');
    await page.click('a:has-text("String Parameter")');
    // The name inputs are dynamically added, so we target the last one
    const nameInputs = page.locator('input[name="parameter.name"]');
    await nameInputs.last().fill('GITEA_EVENT');
    
    // Add String Parameter for GITEA_REPO
    await page.click('button:has-text("Add Parameter")');
    await page.click('a:has-text("String Parameter")');
    await nameInputs.last().fill('GITEA_REPO');

    // Save job
    await page.click('button[name="Submit"]');
    
    // 3. Verify job page is shown
    await expect(page.locator('h1')).toContainText('Project test-job');
  });

  test('2. Setup Gitea, create repo and configure webhook', async ({ page }) => {
    // 1. Gitea Installation
    await page.goto('http://localhost:3001');
    
    // Wait for the "Install Gitea" button to be visible
    await page.waitForSelector('button:has-text("Install Gitea")');
    
    // Fill in admin credentials during installation
    await page.fill('#admin_name', 'giteaadmin');
    await page.fill('#admin_passwd', 'giteaadmin');
    await page.fill('#admin_confirm_passwd', 'giteaadmin');
    await page.fill('#admin_email', 'admin@example.com');
    
    // Install
    await page.click('button:has-text("Install Gitea")');
    
    // Wait for installation to complete and redirect to login or dashboard
    await page.waitForURL('**/user/login**', { timeout: 60000 });
    
    // Login
    await page.fill('input[name="user_name"]', 'giteaadmin');
    await page.fill('input[name="password"]', 'giteaadmin');
    await page.click('button:has-text("Sign In")');
    
    // 2. Create Repository
    await page.goto('http://localhost:3001/repo/create');
    await page.fill('#repo_name', 'test-repo');
    await page.check('input[name="auto_init"]'); // Initialize with README
    await page.click('button:has-text("Create Repository")');
    
    // Wait for repo page to load
    await page.waitForSelector('text=test-repo');
    
    // 3. Configure Webhook
    await page.goto('http://localhost:3001/giteaadmin/test-repo/settings/hooks');
    await page.click('text=Add Webhook');
    await page.click('text=Gitea');
    
    // Fill webhook form
    await page.fill('#payload_url', 'http://webhook-server:3000/gitea-webhook/post');
    await page.selectOption('#http_method', 'POST');
    
    // Trigger on Push and Pull Request
    await page.check('input[value="push"]');
    
    await page.click('button:has-text("Add Webhook")');
    
    // Ensure webhook is added
    await expect(page.locator('.ui.list .item').first()).toContainText('http://webhook-server:3000/gitea-webhook/post');

    // 4. Test Webhook delivery by modifying a file
    await page.goto('http://localhost:3001/giteaadmin/test-repo/_edit/master/README.md');
    // Wait for editor
    await page.waitForSelector('.monaco-editor');
    // We just type something
    await page.keyboard.type('Integration Test\n');
    await page.click('#commit-button');
    
    // Verify commit successful
    await expect(page.locator('.commit-message')).toBeVisible();
    
    // Go to Jenkins and check if job was triggered!
    await page.goto('http://localhost:8080/job/test-job/');
    // Wait for build history to show build #1
    await expect(page.locator('.build-row-cell')).toContainText('#1', { timeout: 15000 });
  });
});
