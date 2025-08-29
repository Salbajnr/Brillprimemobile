{pkgs}: {
  deps = [
    pkgs.postgresql
    pkgs.haskellPackages.dotenv
  ];
}
