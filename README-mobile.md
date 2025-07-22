# Wrap Your Current Web App with Capacitor (iOS & Android)

## Development Workflow

You can keep adding new features and making changes to your web app. To test your latest updates on mobile:

1. Make changes and implement new features in your web app code.
2. Build your web app:
   ```
   npm run build
   ```
3. Copy the latest build to Capacitor native projects:
   ```
   npx cap copy
   ```
4. Open and run in Xcode or Android Studio:
   ```
   npx cap open ios
   npx cap open android
   ```
Repeat these steps as you develop and add features.

## 1. Install Capacitor in your project root
```
npm install @capacitor/core @capacitor/cli
```

## 2. Build your web app
```
npm run build
```
This creates a `dist` or `build` folder (depending on your framework).

## 3. Initialize Capacitor (in your project root)
```
npx cap init
```
- App name: Your app name
- App ID: e.g. com.example.brillprime
- For "Web directory", enter the folder where your build output is (e.g. `dist` or `build`).

## 4. Add mobile platforms
```
npx cap add ios
npx cap add android
```

## 5. Copy your web build to native projects
```
npx cap copy
```

## 6. Open and run in native IDEs
```
npx cap open ios
npx cap open android
```
- For iOS: Use Xcode to build and run.
- For Android: Use Android Studio to build and run.

## 7. Test and build for release
Follow Capacitor docs for publishing to App Store and Play Store.

## Notes
- You can continue developing and adding features to your web app.
- Capacitor wraps your build output and runs it as a native app.
- You can use Capacitor plugins for native features if needed.

## Reference
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Getting Started Guide](https://capacitorjs.com/docs/getting-started)
