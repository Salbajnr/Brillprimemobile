# Wrap Your Current Web App with Capacitor (iOS & Android)

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
- Your existing web app code remains unchanged.
- Capacitor wraps your build output and runs it as a native app.
- You can use Capacitor plugins for native features if needed.

## Reference
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Getting Started Guide](https://capacitorjs.com/docs/getting-started)
