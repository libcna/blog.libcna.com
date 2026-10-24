---
title: Release Engineering for CNA Games
date: 2028-05-11T12:00:00Z
updated: 2026-10-24T12:00:00Z
description: Turn a CNA revision, content build and native dependencies into reproducible signed packages with upgrade and rollback evidence.
author: Robert Vokac
categories: [Development]
tags: [CNA, Release Engineering, CI, Packaging, Deployment]
draft: false
---

A release is one promoted artifact, not a developer directory rebuilt after testing. Pin CNA/dependencies, content compiler and build options; generate build identity; build from clean inputs; test; sign; publish the exact verified bytes.

```text
source revision + dependency lock + toolchains + options
 -> binaries + content -> stage manifest -> smoke/qualification
 -> signatures/checksums -> immutable release artifact
```

Separate fast gates (compile, unit, content validation, package smoke) from scheduled hardware/render parity/soak jobs, but require the evidence promised for each supported target before release candidate promotion.

Manifest every shipped file with path, size and hash. Archive native symbols/source maps under build ID. Generate licenses from actual bundled dependencies and review them. Keep secrets/signing credentials outside the build output and restrict their use to final controlled steps.

Test fresh install, previous-version upgrade, save migration, offline launch, optional renderer absence, interrupted updater and uninstall policy. Rollback application binaries only when newer saves/content remain compatible or are preserved separately.

Publish supported platform-renderer pairs, known gaps, toolchain versions and checksums. Reproduce from tag after release. Release engineering succeeds when the same artifact can be installed, diagnosed and rebuilt later—not only launched once before upload.

## Candidate promotion

Build a candidate once, assign immutable ID and qualify those exact bytes. Promotion changes channel metadata, not binaries. Any fix creates a new candidate and invalidates affected evidence.

Define rollout halt/rollback thresholds for crashes, startup, save migration and renderer fallback. Rollback must account for saves/content/schema already upgraded. Verify executable/content manifest compatibility and partial-download recovery.

After publishing, install from the public channel, verify signature/checksum, launch and create/load a save. Record source, artifact, tests and known issues. This proves users can retrieve the same release CI qualified.

## Version and branch policy

Application version, save/content schema, network protocol and CNA/native ABI are separate. Embed each identity and bump only changed contracts. Define maintenance branch flow and return emergency fixes to main development. Store dependency locks/toolchain images with signed source tag.

## Pipeline gates

Run source/unit/content validation; clean multi-target build/installed consumer; package dependency/license/security scan; packaged smoke; claimed renderer/hardware/mobile/web/server qualification; signing/store/external install. Every result names immutable build. Repeated flakes remain defects.

## Signing and updates

Sign final bytes in isolated minimal-permission job. Generate checksum/SBOM/provenance from final manifest and verify signatures like updater/users do. Archive symbols and test symbolication.

Updater downloads temporary, verifies, checks space, installs transactionally and retains recovery. Program/content move coherently; saves remain separate. Test termination at every phase, locked files, insufficient space, downgrade, proxy/offline and stale cache metadata.

## Post-release

Monitor crash/startup/save/fallback signals by build and define rollout halt before launch. Publish known issues and retain artifact/symbols/evidence. Rebuild tag before security patch. Release reliability comes from practiced repeatable promotion, not a one-time checklist.

## Reproducibility and records

Normalize timestamps/locale/timezone/path where supported, sort archives/manifests and pin generators. Compare hashes; explain signatures/notarization differences via pre-sign/normalized comparison. Release dependency fetches use verified locked sources and stored provenance.

Content compiler/schema go in manifest. Test previous supported saves on copies and power-loss migration. Network release rehearses client/server rollout order and rollback.

Store machine-readable release record: source/dependencies/toolchains/options, manifest, qualifications/gaps, symbols, signatures/checksums and approvals. A future maintainer should reproduce/symbolicate/support without recovering a developer laptop.

## Example release record

```yaml
version: 1.4.0
build_id: 1.4.0+git.abc123
cna_revision: def456
content_schema: 7
protocol: 4
artifacts:
  linux-x64: {sha256: "...", signed: true}
qualification:
  unit: pass
  package_smoke: pass
  renderer_matrix: report/renderer-1.4.0.json
known_gaps: ["video unavailable on target X"]
```

Generate rather than hand-edit identities/hashes. Release notes link this record and migration/support policy. Before final approval, another person or clean automation follows public install instructions and reproduces smoke; author knowledge must not be a hidden dependency.

Schedule post-release archive verification: artifact downloads, signature validation, symbol lookup and source/dependency availability. Backups/provenance that cannot be restored are not release evidence.

Treat an emergency hotfix as an abbreviated normal release: branch from a known tag, change narrowly, run affected regression plus package/security gates, assign a new version/build ID and promote a new immutable artifact. Never patch files inside an already published archive. Merge the fix and test back into active development, record superseded channels and verify users receive the replacement through the normal updater.
