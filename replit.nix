{pkgs}: {
  deps = [
    pkgs.nix-output-monitor
    pkgs.postgresql
    pkgs.haskellPackages.dotenv
  ];
}
