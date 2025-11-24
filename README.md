Change all 8 design placeholder boxes to mint/emerald gradient:

TASK: Replace all colorful gradients on the design boxes with uniform mint/emerald color

CHANGES NEEDED:

Replace ALL 8 boxes with the same mint/emerald gradient:

FROM (colorful - different colors):
- from-purple-400 to-pink-500
- from-orange-400 to-red-500
- from-cyan-400 to-blue-500
- from-green-400 to-emerald-500
- from-pink-400 to-purple-500
- from-yellow-400 to-orange-500
- from-teal-400 to-cyan-500
- from-indigo-400 to-purple-500

TO (all mint/emerald):
bg-gradient-to-br from-cyan-100 to-emerald-200

OR for slightly more visible boxes:
bg-gradient-to-br from-emerald-100 to-teal-200

UPDATED GRID CODE:
-----------------

{/* Grid of different-sized design placeholders - ALL MINT/EMERALD */}
<div className="relative w-full h-full flex flex-col gap-4">
  
  {/* Row 1 - Two different sized boxes */}
  <div className="flex gap-4 h-[25%]">
    <div className="w-[40%] bg-gradient-to-br from-emerald-100 to-teal-200 rounded-xl shadow-md"></div>
    <div className="flex-1 bg-gradient-to-br from-emerald-100 to-teal-200 rounded-xl shadow-md"></div>
  </div>
  
  {/* Row 2 - One wide box */}
  <div className="h-[20%]">
    <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-200 rounded-xl shadow-md"></div>
  </div>
  
  {/* Row 3 - Three different sized boxes */}
  <div className="flex gap-4 h-[30%]">
    <div className="w-[30%] bg-gradient-to-br from-emerald-100 to-teal-200 rounded-xl shadow-md"></div>
    <div className="w-[45%] bg-gradient-to-br from-emerald-100 to-teal-200 rounded-xl shadow-md"></div>
    <div className="flex-1 bg-gradient-to-br from-emerald-100 to-teal-200 rounded-xl shadow-md"></div>
  </div>
  
  {/* Row 4 - Two boxes */}
  <div className="flex gap-4 flex-1">
    <div className="flex-1 bg-gradient-to-br from-emerald-100 to-teal-200 rounded-xl shadow-md"></div>
    <div className="w-[35%] bg-gradient-to-br from-emerald-100 to-teal-200 rounded-xl shadow-md"></div>
  </div>
  
</div>

SUMMARY:
--------
✅ All 8 boxes now use: from-emerald-100 to-teal-200
✅ Uniform, cohesive color scheme
✅ Subtle mint/emerald gradient throughout
✅ Professional, clean look
✅ Matches background blobs

Show me the updated design with all mint/emerald boxes!# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/085e8645-287d-483a-b0eb-5aba3140a3b4

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/085e8645-287d-483a-b0eb-5aba3140a3b4) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/085e8645-287d-483a-b0eb-5aba3140a3b4) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes it is!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
